// This line must come before importing any instrumented module.
const tracer = require('dd-trace').init()
const path = require('path');
const webpack = require('webpack');
const express = require("express");
const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const https = require("https");

function getRequest() {
  const url = "https://opentelemetry.io/";

  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      resolve(res.statusCode);
    });

    req.on("error", (err) => {
      reject(new Error(err));
    });
  });
}

const app = express();
app.use(bodyParser.json());

// Predefined array of items
const predefinedItems = [
  { id: "1", name: "Item 1", description: "This is item 1" },
  { id: "2", name: "Item 2", description: "This is item 2" },
  { id: "3", name: "Item 3", description: "This is item 3" },
];

let items = [...predefinedItems];

// Reset items to predefined array before each request
app.use((req, res, next) => {
  items = [...predefinedItems];
  next();
});

// Create
app.post("/items", (req, res) => {
  console.log("request recievedd here");
  const newItem = { id: uuidv4(), ...req.body };
  items.push(newItem);
  res.status(201).json(newItem);
});

// Read all
app.get("/items", async (req, res) => {
  console.log("request recievedd here");
  tracer.startActiveSpan("HeavyProcessing", async (span) => {
    /*
       Add Custom Events and Attributes
    */
    span.setAttribute("foo", "bar");
    span.addEvent("Custom Get CHallenge Event");
    const result = await getRequest();

    //await delay(20000);
    span.end();
  });

  res.json(items);
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Read one
app.get("/items/:id", (req, res) => {
  try {
    throw new Error("oh items not found errorerror!");
  } catch (e) {

  }
  const item = items.find((item) => item.id === req.params.id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ message: "Item not found" });
  }
});

// Update
app.put("/items/:id", (req, res) => {
  const index = items.findIndex((item) => item.id === req.params.id);
  if (index !== -1) {
    items[index] = { ...items[index], ...req.body };
    res.json(items[index]);
  } else {
    res.status(404).json({ message: "Item not found" });
  }
});

// Delete
app.delete("/items/:id", (req, res) => {
  const index = items.findIndex((item) => item.id === req.params.id);
  if (index !== -1) {
    const deletedItem = items[index];
    items.splice(index, 1);
    res.json(deletedItem);
  } else {
    res.status(404).json({ message: "Item not found" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Naman APP Internal Server Error" });
});

app.listen(3000, () => {
  console.log("server staretd on 3000");
});

module.exports = {
  target: 'node',
  entry: './index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2',
  },
  externals: [
    'express',
    'dd-trace',
  ],
  plugins: [
    new webpack.BannerPlugin({
      raw: true,
      entryOnly: true,
      banner:
        `process.env.DD_GIT_REPOSITORY_URL=${process.env.DD_GIT_REPOSITORY_URL};` +
        `process.env.DD_GIT_COMMIT_SHA=${process.env.DD_GIT_COMMIT_SHA};`,
    }),
  ],
};
