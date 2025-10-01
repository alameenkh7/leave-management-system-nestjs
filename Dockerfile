FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (development dependencies are needed for 'start:dev')
RUN npm install

# Copy source code (will be overwritten by volume mount in compose)
COPY . .

EXPOSE 3000

# Command to run the application with hot-reloading
CMD ["npm", "run", "start:dev"]