import ujson.Value
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat

import scala.io.StdIn

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

case class Coordinate(lat: Double, lon: Double)
case class Country(name: String, polygons: Vector[Vector[Coordinate]])
case class Rect(x1: Double, y1: Double, x2: Double, y2: Double)

def find_borders(polygons: Vector[Vector[Coordinate]]): Vector[Rect] = {
    polygons.map(x => Rect(x.maxBy(x => -x.lon).lon, x.maxBy(x => x.lat).lat, x.maxBy(x => x.lon).lon, x.maxBy(x => -x.lat).lat))
}

def intersects(country_rect: Rect, visible_area: Rect): Boolean = {
    !(country_rect.y1 < visible_area.y2 || country_rect.y2 > visible_area.y1 || country_rect.x1 > visible_area.x2 || country_rect.x2 < visible_area.x1)
}

def intersects(c: Country, rect: Rect, country_borders: Vector[Rect]): Country = {
    val indexedPolygons = c.polygons.zipWithIndex
    Country(c.name, indexedPolygons.collect { case (p, i) if intersects(country_borders(i), rect) => p })
}

object main {
    def main(args: Array[String]): Unit = {
        val json = ujson.read(os.read(os.pwd / "data" / "countries.json"))
        val countries_builder = Map.newBuilder[String, Country]
        val countries_borders_builder = Map.newBuilder[String, Vector[Rect]]

        for (country <- json("features").arr)
        {
            val name = country("properties")("ADMIN").str
            val polygon = country("geometry")("type").str match {
                case x if x == "Polygon" => Vector(country("geometry")("coordinates").arr(0).arr.map(x => Coordinate(x.arr(1).num, x.arr(0).num)).toVector)
                case x if x == "MultiPolygon" => country("geometry")("coordinates").arr.map(x => x(0).arr.map(x => Coordinate(x.arr(1).num, x.arr(0).num)).toVector).toVector
                case x => throw new IllegalArgumentException(s"Unexpected geometry type: $x, country: $name")
            }

            countries_builder += (name -> Country(name, polygon))
            countries_borders_builder += (name -> find_borders(polygon))
        }

        val countries = countries_builder.result()
        val countries_borders = countries_borders_builder.result()

        implicit val system: ActorSystem[_] = ActorSystem(Behaviors.empty, "Map")
        implicit val executionContext: ExecutionContext = system.executionContext
        implicit val coordinateFormat: RootJsonFormat[Coordinate] = jsonFormat2(Coordinate.apply)
        implicit val countryFormat: RootJsonFormat[Country] = jsonFormat2(Country.apply)
        implicit val vectorCountryFormat: RootJsonFormat[Vector[Country]] = vectorFormat[Country]

        def fetchCountry(name: String): Future[Option[Country]] = Future {
            countries.get(name)
        }

        def find_countries(lat: Double, lon: Double, pov_width: Double, pov_height: Double): Future[Vector[Country]] = Future {
            val visible_area = Rect(lon, lat, lon + pov_width, lat - pov_height)
            countries.map(x => intersects(x._2, visible_area, countries_borders(x._2.name))).toVector.filter(_.polygons.nonEmpty)
        }

        val route: Route =
            concat(
                get {
                    pathPrefix("item" / Segment) { name =>
                        val maybeItem = fetchCountry(name)

                        onSuccess(maybeItem) {
                            case Some(item) => complete(item)
                            case None => complete(StatusCodes.NotFound)
                        }
                    }
                },
                get {
                    path("countries") {
                        parameter("lat".as[Double],
                            "lon".as[Double],
                            "pov_width".as[Double],
                            "pov_height".as[Double]
                        ) {(lat, lon, pov_width, pov_height) =>
                            val res = find_countries(lat, lon, pov_width, pov_height)
                            onSuccess(res) {
                                countries => complete(countries)
                            }
                        }
                    }
                }
            )

        val bindingFuture = Http().newServerAt("localhost", 8080).bind(route)
        println(s"Server online at http://localhost:8080/\nPress RETURN to stop...")
        StdIn.readLine() // let it run until user presses return
        bindingFuture
          .flatMap(_.unbind()) // trigger unbinding from the port
          .onComplete(_ => system.terminate()) // and shutdown when done
    }
}
