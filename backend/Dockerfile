FROM node:18-alpine

# Set the working directory to /app/backend
WORKDIR /app/backend

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy all backend source code
COPY . .

# Expose port (must match the PORT environment variable)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
