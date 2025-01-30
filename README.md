# webapp
# Health Check API

## Description
This API offers a straightforward health monitoring solution for web services, developed using Node.js and Express. It utilizes a MySQL database to record entries from each health check, ensuring that the service remains operational and accessible.

## Prerequisites
- Node.js (v20.17.0)
- npm (Node Package Manager)
- MySQL Server (5.7 or higher recommended)

## Local Setup
1. **Clone the repository:**
   `git clone [repository-url]`

2. **Navigate to the project directory:**
   `cd [project-directory]`

3. **Install dependencies:**
   `npm install`

4. **Set up the environment variables:**
   Create a `.env` file in the root directory of the project and add the environment variables
5. **Start the application:**
`npm start`

## API Endpoints

### `GET /healthz`
- **Description:** Performs a health check and logs the check in the database.
- **Response Status Codes:**
- `200 OK`: Health check was successful, and the system is operating normally.
- `503 Service Unavailable`: Health check failed due to a server or database error.

### `POST, PUT, DELETE /healthz`
- **Description:** These methods are not allowed for this endpoint.
- **Response Status Codes:**
- `405 Method Not Allowed`: Indicates that the request method is not supported by the endpoint.

### `All other routes`
- **Description:** Handles all other undefined routes.
- **Response Status Codes:**
- `404 Not Found`: The requested route does not exist.

## Additional Information
- The application uses headers to prevent caching and improve security by specifying:
- `Cache-Control: no-cache, no-store, must-revalidate` to ensure responses are not cached.
- `Pragma: no-cache` to avoid caching on older HTTP/1.0 proxies.
- `X-Content-Type-Options: nosniff` to block browsers from MIME-sniffing a response away from the declared content-type.