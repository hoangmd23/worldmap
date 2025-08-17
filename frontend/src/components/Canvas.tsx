import {useRef, useEffect} from "react";
import * as React from "react";

interface Coordinate {
    lat: number;
    lon: number;
}

interface Country {
    name: string;
    polygons: Coordinate[][];
}

class Player
{
    speed: number = 0.005;
    pov_width: number = 200;
    pov_height: number = 100;
    lat: number = 0;
    lon: number = 0;

    constructor(lat: number, lon: number) {
        this.lat = lat;
        this.lon = lon;
    }

    go_east(): void {
        this.lon += this.speed * this.pov_width;
        if (this.lon + this.pov_width >= 180)
            this.lon = 180 - this.pov_width;
    }

    go_west(): void {
        this.lon -= this.speed * this.pov_width;
        if (this.lon <= -180)
            this.lon = -180;
    }

    go_north(): void {
        this.lat += this.speed * this.pov_height;
        if (this.lat >= 90)
            this.lat = 90;
    }

    go_south(): void {
        this.lat -= this.speed * this.pov_height;
        if (this.lat - this.pov_height <= -90)
            this.lat = -90 + this.pov_height;
    }
}

function getCountryColor(name: string): string
{
    let res = Array.from(name).map(ch => ch.charCodeAt(0)).reduce((a, b) => a + b, 0);
    res *= 12345678;
    const red = (res % 240 + 16).toString(16);
    res = Math.floor(res / 256);
    const green = (res % 240 + 16).toString(16);
    res = Math.floor(res / 256);
    const blue = (res % 240 + 16).toString(16);
    return `#${red}${green}${blue}`;
}

function MapApp() {
    const canvas_width = 1000;
    const canvas_height = 500;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const buffer = document.createElement("canvas");
    buffer.width = canvas_width;
    buffer.height = canvas_height;
    const bctx = buffer.getContext("2d")!;

    const mousePressed = useRef(false);
    const mouse_x = useRef(0);
    const mouse_y = useRef(0);
    const player = useRef<Player>(new Player(100,  0));

    const redraw = () => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        fetch_data().then((countries) => {
            bctx.fillStyle = "#55a9ed";
            bctx.fillRect(0, 0, canvas_width, canvas_height);
            // bctx.fillStyle = "black";
            // bctx.font = "20px Arial";
            // const info = `Longitute: ${player.current.lon.toFixed(2)}, latitude: ${player.current.lat.toFixed(2)}`;
            // bctx.fillText(info, 100, 20);

            for (const country of countries) {
                for (const p of country.polygons)
                {
                    bctx.beginPath();
                    const coord0 = p[0]!;
                    const x0 = (coord0.lon - player.current.lon) * canvas_width / player.current.pov_width;
                    const y0 = (player.current.lat - coord0.lat) * canvas_height / player.current.pov_height;
                    bctx.moveTo(x0, y0);

                    for (const coord of p.slice(1))
                    {
                        const x = (coord.lon - player.current.lon) * canvas_width / player.current.pov_width;
                        const y = (player.current.lat - coord.lat) * canvas_height / player.current.pov_height;
                        bctx.lineTo(x, y);
                    }

                    bctx.closePath();
                    bctx.fillStyle = getCountryColor(country.name);
                    bctx.fill();
                    bctx.strokeStyle = "black";
                    bctx.stroke();
                }
            }

            ctx.clearRect(0, 0, canvas_width, canvas_height);
            ctx.drawImage(buffer, 0, 0);
        })
    }

    const zoom_in = () => {
        const scale = 0.95;
        player.current.pov_height *= scale;
        player.current.pov_width *= scale;
        redraw();
    }

    const zoom_out = () => {
        const scale = 1.05;
        player.current.pov_height *= scale;
        player.current.pov_width *= scale;
        redraw();
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        mousePressed.current = true;
        mouse_x.current = e.clientX;
        mouse_y.current = e.clientY;
    }

    const handleMouseUp = (_: React.MouseEvent<HTMLCanvasElement>) => {
        mousePressed.current = false;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Control") {
            zoom_in();
        } else if (e.key === "Shift") {
            zoom_out();
        }
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (mousePressed.current) {
            const dx = e.clientX - mouse_x.current;
            const dy = e.clientY - mouse_y.current;
            mouse_x.current = e.clientX;
            mouse_y.current = e.clientY;
            if (dx > 0) {
                player.current.go_west();
            }
            if (dx < 0) {
                player.current.go_east();
            }
            if (dy > 0) {
                player.current.go_north();
            }
            if (dy < 0) {
                player.current.go_south();
            }
            redraw();
        }
    }

    const fetch_data = async () : Promise<Country[]> => {
        const lat = player.current.lat;
        const lon = player.current.lon;
        const pov_width = player.current.pov_width;
        const pov_height = player.current.pov_height;

        const res = await fetch(`/api/countries?lat=${lat}&lon=${lon}&pov_width=${pov_width}&pov_height=${pov_height}`);
        return res.json();
    };

    window.addEventListener("keydown", handleKeyDown);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas === null)
        {
            throw new Error("Could not find a canvas element");
        }

        const ctx = canvas.getContext("2d");
        if (ctx === null)
        {
            throw new Error("Could not get 2D context");
        }

        ctxRef.current = ctx;
        redraw();
    }, []);

    return (
        <>
            <canvas ref={canvasRef}
                    width={canvas_width}
                    height={canvas_height}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
            />
        </>
    )
}

export default MapApp;
