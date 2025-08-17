ThisBuild / version := "0.1.0-SNAPSHOT"

ThisBuild / scalaVersion := "3.3.6"

ThisBuild / resolvers += "Akka library repository" at "https://repo.akka.io/maven"

val AkkaVersion = "2.10.5"
val AkkaHttpVersion = "10.7.1"

lazy val root = (project in file("."))
  .settings(
      name := "worldmap",
      libraryDependencies ++= Seq(
          "com.lihaoyi" %% "upickle" % "4.2.1",
          "com.lihaoyi" %% "os-lib" % "0.11.5",
          "com.typesafe.akka" %% "akka-actor-typed" % AkkaVersion,
          "com.typesafe.akka" %% "akka-stream" % AkkaVersion,
          "com.typesafe.akka" %% "akka-http" % AkkaHttpVersion,
          "com.typesafe.akka" %% "akka-http-spray-json" % AkkaHttpVersion,
      )
  )
