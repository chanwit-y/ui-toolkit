# Gummy UI API Server

A Hono-based API server for the Gummy UI toolkit with image upload capabilities.

## Features

- 🚀 Built with [Hono](https://hono.dev/) - Fast, lightweight web framework
- 📁 Image upload with validation and file management
- 🔒 CORS configured for frontend integration
- 📝 TypeScript support
- 🛡️ File type and size validation

## Getting Started

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

The API server will start on `http://localhost:9000` (configurable via PORT environment variable)

### Build

```bash
bun run build
bun run start
```

## API Endpoints

### Upload Endpoints

#### Upload Single Image
```
POST /upload/single
Content-Type: multipart/form-data

Form data:
- image: File (JPEG, JPG, PNG, GIF, WebP)
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "filename": "image-1234567890.jpg",
    "originalName": "image.jpg",
    "mimetype": "image/jpeg",
    "size": 102400,
    "url": "/uploads/image-1234567890.jpg",
    "path": "/path/to/uploads/image-1234567890.jpg"
  }
}
```

#### Upload Multiple Images
```
POST /upload/multiple
Content-Type: multipart/form-data

Form data:
- images: File[] (max 10 files)
```

#### Get Uploaded Image
```
GET /uploads/:filename
```

Returns the image file with appropriate content-type headers.

#### Delete Image
```
DELETE /upload/:filename
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "filename": "image-1234567890.jpg"
  }
}
```

### Validation

- **File Types**: JPEG, JPG, PNG, GIF, WebP
- **File Size**: Maximum 10MB per file
- **Multiple Upload**: Maximum 10 files per request

### Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error codes:
- `400`: Bad request (invalid file type, no file, etc.)
- `404`: File not found
- `500`: Server error

## Directory Structure

```
apps/api/
├── src/
│   ├── middleware/
│   │   └── upload.ts      # Multer configuration
│   ├── routes/
│   │   ├── countries.ts   # Existing country routes
│   │   └── upload.ts      # Upload routes
│   └── index.ts           # Main server file
├── uploads/               # Upload directory
├── package.json
└── tsconfig.json
```

## Environment Variables

- `PORT`: Server port (default: 9000)