// Package docs provides swagger documentation for Tavkit API.
package docs

import "github.com/swaggo/swag"

const docTemplate = `{
    "swagger": "2.0",
    "info": {
        "description": "{{escape .Description}}",
        "title": "{{.Title}}",
        "contact": {
            "name": "API Support"
        },
        "license": {
            "name": "MIT"
        },
        "version": "{{.Version}}"
    },
    "host": "{{.Host}}",
    "basePath": "{{.BasePath}}",
    "paths": {
        "/health": {
            "get": {
                "description": "Health check endpoint",
                "produces": ["application/json"],
                "tags": ["health"],
                "summary": "Check API health",
                "responses": {
                    "200": {"description": "OK"}
                }
            }
        },
        "/auth/login": {
            "post": {
                "description": "Authenticate user and return JWT token",
                "consumes": ["application/json"],
                "produces": ["application/json"],
                "tags": ["auth"],
                "summary": "User login",
                "parameters": [{
                    "description": "Login credentials",
                    "name": "body",
                    "in": "body",
                    "required": true,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "username": {"type": "string"},
                            "password": {"type": "string"}
                        }
                    }
                }],
                "responses": {
                    "200": {"description": "OK"}
                }
            }
        },
        "/characters": {
            "get": {
                "security": [{"BearerAuth": []}],
                "description": "Get list of characters for current user",
                "produces": ["application/json"],
                "tags": ["characters"],
                "summary": "List characters",
                "responses": {
                    "200": {"description": "OK"}
                }
            }
        },
        "/dndbeyond/import/{characterId}": {
            "post": {
                "security": [{"BearerAuth": []}],
                "description": "Import character data from D&D Beyond API",
                "produces": ["application/json"],
                "tags": ["dndbeyond"],
                "summary": "Import D&D Beyond character",
                "parameters": [{
                    "type": "integer",
                    "description": "D&D Beyond Character ID",
                    "name": "characterId",
                    "in": "path",
                    "required": true
                }],
                "responses": {
                    "200": {"description": "OK"}
                }
            }
        }
    },
    "securityDefinitions": {
        "BearerAuth": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Type 'Bearer' followed by a space and JWT token"
        }
    }
}`

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = &swag.Spec{
	Version:          "1.0",
	Host:             "localhost:8000",
	BasePath:         "/api/v1",
	Schemes:          []string{"http", "https"},
	Title:            "Tavkit API",
	Description:      "Tavkit Campaign Management Toolkit API",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
