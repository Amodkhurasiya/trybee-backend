FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk --no-cache add curl

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Create a new env file with required variables
RUN echo "NODE_ENV=production" > .env

# Create a new CORS proxy file
RUN echo 'const express = require("express"); \
const app = express(); \
const PORT = process.env.PORT || 5000; \
console.log("CORS proxy server starting..."); \
app.use((req, res, next) => { \
  console.log(`${req.method} ${req.url}`); \
  res.header("Access-Control-Allow-Origin", "*"); \
  res.header("Access-Control-Allow-Headers", "*"); \
  res.header("Access-Control-Allow-Methods", "*"); \
  if (req.method === "OPTIONS") { \
    console.log("Handling OPTIONS request"); \
    return res.sendStatus(200); \
  } \
  next(); \
}); \
const server = require("./server"); \
app.use("/", server); \
app.listen(PORT, () => { \
  console.log(`CORS proxy running on port ${PORT}`); \
});' > cors-proxy.js

# Expose the port
EXPOSE 5000

# Start the application with the CORS proxy
CMD ["node", "cors-proxy.js"] 