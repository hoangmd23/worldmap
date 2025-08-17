# Worldmap

A web application for visualizing country borders on an interactive map. Users can pan and zoom around the world map, and the backend calculates which country borders are visible in the current viewport.

## Features

- Interactive world map using **React** and **Vite**.
- Real-time viewport tracking: frontend sends current map position to backend.
- Backend in **Scala** calculates visible country borders.
- Polygons of countries' borders are returned to the frontend and rendered dynamically.

## Data Source

This project uses country borders data from **[Natural Earth](https://www.naturalearthdata.com/)**.  

## Usage

```
cd frontend
npm install
npm run dev
```

```
cd backend
sbt
run
```

## Demo

Here’s a preview of the application in action:

![Demo of Country Borders Map](demo.gif)
