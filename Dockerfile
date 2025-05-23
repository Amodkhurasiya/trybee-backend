FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies without dev dependencies
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Expose the port
EXPOSE 5000

# Start the application
CMD ["node", "start.js"] 