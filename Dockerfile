# Base image: lightweight Node.js 18 (Alpine version)
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package.json & package-lock.json to container
COPY package*.json ./

# Install all dependencies inside container
RUN npm install

# Copy entire project code to container
COPY . .

# Expose port 5000 so app can be accessed from outside
EXPOSE 5000

# Start the Node.js application
CMD ["node", "index.js"]

