.PHONY: swagger
swagger:
	@echo "Generating Swagger documentation..."
	@which swag > /dev/null || (echo "Installing swag..." && go install github.com/swaggo/swag/cmd/swag@latest)
	swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal

.PHONY: build
build: swagger
	@echo "Building server..."
	go build -o bin/server cmd/server/main.go

.PHONY: run
run: swagger
	@echo "Running server..."
	go run cmd/server/main.go
