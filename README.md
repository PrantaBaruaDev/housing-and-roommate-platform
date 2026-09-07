# Housing & Roommate Platform API

Backend API for a housing marketplace and roommate platform. The system supports tenant registration and authentication, owner property and room inventory management, room viewing requests, rental applications, invoices, and bKash payments.

## Contents

- [Technology](#technology)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Authentication and Roles](#authentication-and-roles)
- [API Conventions](#api-conventions)
- [Route Reference](#route-reference)
- [Request Examples](#request-examples)
- [Business Workflows](#business-workflows)
- [Database and Prisma](#database-and-prisma)
- [Scripts](#scripts)

## Technology

- Node.js with TypeScript and Express 5
- PostgreSQL with Prisma ORM
- Redis for runtime services used by the application
- JWT access and refresh tokens
- Passport Local and Google OAuth authentication
- Zod request validation
- bKash payment checkout integration
- Helmet, CORS, cookies, and rate limiting

## Getting Started

### Prerequisites

- Node.js
- pnpm 11 or a compatible pnpm version
- PostgreSQL database
- Redis instance
- Google OAuth credentials if Google login is enabled
- bKash credentials if payments are enabled

### Install and configure

```bash
pnpm install
copy .env.example .env
```

Create `.env` from the variable list below. Do not commit `.env`, OAuth client secrets, payment credentials, or JWT secrets.

### Prepare the database

```bash
pnpm exec prisma migrate dev
pnpm prisma generate
```

Optional development seed data:

```bash
pnpm db:seeds
pnpm db:delete_seeds
```

### Run the API

```bash
pnpm dev
```

The server connects to PostgreSQL and Redis before listening. The default port is supplied by `PORT`; open `GET /` to verify that the API process is responding.

Production build and start:

```bash
pnpm build
pnpm start
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime environment, such as `development` or `production` |
| `PORT` | HTTP port |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Application URL |
| `FRONTEND_URL` | Allowed CORS origin and OAuth redirect destination |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRES_IN` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CLIENT_CALLBACK_URL` | Google OAuth callback URL |
| `REDIS_USER` | Redis username |
| `REDIS_PASSWORD` | Redis password |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `BKASH_BASE_URL` | bKash API base URL |
| `BKASH_USERNAME` | bKash API username |
| `BKASH_PASSWORD` | bKash API password |
| `BKASH_APP_KEY` | bKash application key |
| `BKASH_APP_SECRET` | bKash application secret |
| `BKASH_CALLBACK_URL` | bKash callback URL |
| `TESTER_ADMIN_*` | Seed admin credentials |
| `TESTER_OWNER_*` | Seed owner credentials |
| `TESTER_TENANT_*` | Seed tenant credentials |

The configuration reads the Google callback URL from `GOOGLE_CLIENT_CALLBACK_URL`.

## Architecture

The API follows a modular Express structure:

```text
src/
	app.ts                         Express middleware and route registration
	server.ts                      PostgreSQL/Redis connection and HTTP startup
	app/config                     Environment configuration and Passport setup
	app/middleware                 Auth, validation, rate limiting, errors
	app/module/<feature>           Route, controller, service, validation, interface
	app/lib                        Prisma, Redis, Google Auth, bKash clients
	generated/prisma               Generated Prisma client and enums
prisma/schema                   Split Prisma schema files
prisma/migrations                Database migration history
```

Request lifecycle:

1. Helmet, CORS, URL-encoded parsing, JSON parsing, and cookies are installed.
2. Passport is initialized.
3. `/api/v1` receives the global rate limiter; auth routes also receive the auth rate limiter.
4. Protected routes verify a Bearer access token and load the current user from PostgreSQL.
5. Zod validation runs on routes that declare a validation schema.
6. Controllers call feature services and return the shared response shape.
7. The global error handler formats validation, authentication, Prisma, and application errors.

## Authentication and Roles

Supported roles are `ADMIN`, `OWNER`, and `TENANT`.

- `TENANT`: browse properties, request viewings, submit applications, view own occupancy/invoices/payments.
- `OWNER`: create and manage owned properties, flats, rooms, view requests, applications, and invoices.
- `ADMIN`: administrative access to users, deleted properties, all permitted management operations, and payment deletion.

For protected endpoints, send the access token as:

```http
Authorization: Bearer <access-token>
```

Login and registration also set authentication cookies. `POST /api/v1/auth/refresh-token` reads the `refreshToken` cookie and returns a new access token and refresh token. `POST /api/v1/auth/logout` clears the auth cookies.

Google login starts with `GET /api/v1/auth/google`, which returns an OAuth URL. Google then redirects to `/api/v1/auth/google/callback`; success redirects to the configured frontend with an access token.

## API Conventions

### Base URL

```text
http://localhost:<PORT>/api/v1
```

### Success response

Most controller responses use:

```json
{
	"success": true,
	"message": "Resource retrieved successfully",
	"data": {},
	"meta": {
		"page": 1,
		"limit": 10,
		"total": 25,
		"totalPages": 3
	}
}
```

`meta` is included for paginated list endpoints. Some endpoints return an object or array without pagination metadata.

### Pagination, sorting, searching, and filters

Supported list query parameters are:

| Parameter | Default | Description |
| --- | --- | --- |
| `page` | `1` | Page number |
| `limit` | `10` | Number of records per page |
| `sortBy` | `createdAt` | Database field used for sorting |
| `sortOrder` | `desc` | `asc` or `desc` |
| `searchTerm` | none | Feature-specific text search |
| other parameters | none | Feature-specific equality filters |

Example: `GET /api/v1/properties?page=2&limit=10&sortBy=createdAt&sortOrder=desc&searchTerm=dhaka`

### Error response

```json
{
	"success": false,
	"message": "Validation error: Invalid input data provided.",
	"errors": [
		{
			"path": "email",
			"message": "Invalid email address"
		}
	]
}
```

Common statuses are `400` for invalid input, `401` for missing or invalid authentication, `403` for role or ownership violations, `404` for missing records, `409` for duplicate or conflicting records, and `500` for unexpected failures.

## Route Reference

All paths below are relative to `/api/v1`.

### Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | API welcome/health response |

### Authentication and users

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register an owner or tenant |
| `POST` | `/auth/login` | Public | Login with email and password |
| `GET` | `/auth/google` | Public | Generate Google OAuth URL |
| `GET` | `/auth/google/callback` | OAuth | Complete Google login |
| `GET` | `/auth/me` | Any authenticated role | Return current user and profile |
| `POST` | `/auth/refresh-token` | Refresh cookie | Issue new access and refresh tokens |
| `POST` | `/auth/logout` | Public | Clear auth cookies |
| `GET` | `/auth/users-list` | `ADMIN` | Paginated user list |

### Properties

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/properties` | Public | List non-deleted properties |
| `GET` | `/properties/:id` | Public | Get one property |
| `POST` | `/properties` | `ADMIN`, `OWNER` | Create a property |
| `GET` | `/properties/owner` | `ADMIN`, `OWNER` | List the current owner's properties |
| `GET` | `/properties/is-deleted` | `ADMIN` | List deleted properties |
| `PATCH` | `/properties/:id` | `ADMIN`, `OWNER` | Update a property |
| `PATCH` | `/properties/:id/delete` | `ADMIN`, `OWNER` | Soft-delete a property |
| `DELETE` | `/properties/:id` | `ADMIN` | Permanently delete a property |

### Flats and rooms

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/properties/flat` | Public | List flat and room inventory |
| `GET` | `/properties/flat/:id` | Public | Get flat details with rooms |
| `POST` | `/properties/flat` | `ADMIN`, `OWNER` | Create a flat and its rooms |
| `POST` | `/properties/flat/add-rooms` | `ADMIN`, `OWNER` | Add rooms to an existing flat |
| `PATCH` | `/properties/flat/edit/:flatId` | `ADMIN`, `OWNER` | Update flat details |
| `PATCH` | `/properties/flat/room/edit/:roomId` | `ADMIN`, `OWNER` | Update room details |
| `DELETE` | `/properties/flat/room/delete/:roomId` | `ADMIN`, `OWNER` | Delete a room |

### Applications

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/applications` | Any authenticated role | Submit an application for a room |
| `GET` | `/applications` | Any authenticated role | List applications visible to the user |
| `GET` | `/applications/:id` | Any authenticated role | Get one application |
| `PATCH` | `/applications/:id` | `ADMIN`, `OWNER` | Update application status/details |
| `DELETE` | `/applications/:id` | `ADMIN` | Delete an application |

### Room viewing requests

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/room_view_request` | Any authenticated role | Request a room viewing |
| `GET` | `/room_view_request` | Any authenticated role | List visible viewing requests |
| `GET` | `/room_view_request/:id` | Any authenticated role | Get one viewing request |
| `PATCH` | `/room_view_request/:id` | Any authenticated role | Approve, reject, or reschedule a request |
| `DELETE` | `/room_view_request/:id` | `ADMIN` | Delete a viewing request |

### Room occupants

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/room_occupant` | Any authenticated role | Return the user's applicable occupancy details |

### Invoices

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/invoice` | `ADMIN`, `OWNER` | Create an invoice |
| `GET` | `/invoice` | Any authenticated role | List invoices visible to the user |
| `GET` | `/invoice/:id` | Any authenticated role | Get one invoice |
| `PATCH` | `/invoice/:id` | `ADMIN`, `OWNER` | Update an invoice |
| `DELETE` | `/invoice/:id` | `ADMIN`, `OWNER` | Delete an invoice |

### Payments

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/payments/create/bkash` | Any authenticated role | Create a bKash checkout session |
| `GET` | `/payments` | Any authenticated role | Get the user's payment history |
| `GET` | `/payments/:id` | Any authenticated role | Get one payment owned by the user |
| `DELETE` | `/payments/:id` | `ADMIN` | Delete a payment |
| `GET` | `/payments/applications/payment/callback` | Public callback | Receive the bKash callback and redirect to the frontend |

## Request Examples

### Register a tenant or owner

`POST /api/v1/auth/register`

`ADMIN` cannot self-register. The password is hashed before storage.

```json
{
	"name": "Ayesha Rahman",
	"email": "ayesha@example.com",
	"password": "StrongPass1!",
	"role": "TENANT",
	"profilePhoto": "https://cdn.example.com/ayesha.jpg",
	"address": "Dhanmondi, Dhaka",
	"phone": "+8801712345678",
	"nid": "1234567890"
}
```

### Login

`POST /api/v1/auth/login`

```json
{
	"email": "ayesha@example.com",
	"password": "StrongPass1!"
}
```

The password must be at least eight characters and contain a lowercase letter, uppercase letter, number, and special character.

### Create a property

`POST /api/v1/properties`

```json
{
	"title": "Green View Residence",
	"description": "Furnished apartments close to public transport.",
	"address": "Road 7, Dhanmondi",
	"city": "Dhaka"
}
```

### Create a flat with rooms

`POST /api/v1/properties/flat`

```json
{
	"propertyId": "property-uuid",
	"flatName": "Flat A3",
	"floorNumber": 3,
	"rooms": [
		{
			"roomNumber": "301A",
			"rentAmount": 18000,
			"bookingMode": "BOOK_BY_ROOM",
			"maxCapacity": 1
		},
		{
			"roomNumber": "301B",
			"rentAmount": 9000,
			"bookingMode": "BOOK_BY_SEAT",
			"maxCapacity": 2
		}
	]
}
```

`bookingMode` defaults to `BOOK_BY_ROOM`, and `maxCapacity` defaults to `1`.

### Request a room viewing

`POST /api/v1/room_view_request`

This route currently accepts a body consumed by the service; the route does not attach a Zod validator.

```json
{
	"roomId": "room-uuid",
	"proposedDate": "2026-09-15T10:00:00.000Z"
}
```

New requests start with `PENDING`. A tenant may have only one active pending/rescheduled request for the same room.

### Create an application

`POST /api/v1/applications`

```json
{
	"roomId": "room-uuid",
	"moveInDate": "2026-10-01",
	"isPrivateLease": false,
	"agreedRentAmount": 9000
}
```

The default application status is `PENDING` in the database. Owners or admins can update the application with `APPROVED`, `REJECTED`, or `CANCELLED`.

### Create an invoice

`POST /api/v1/invoice`

```json
{
	"roomOccupantId": "occupant-uuid",
	"billMonth": "2026-09",
	"type": "COMBINED_RENT_UTILITY",
	"rentAmount": 9000,
	"utilityDetails": [
		{ "name": "Electricity", "amount": 850 },
		{ "name": "Water", "amount": 300 }
	],
	"dueDate": "2026-09-10"
}
```

`billMonth` must use `YYYY-MM`. Utility amounts and rent cannot be negative.

### Start a bKash payment

`POST /api/v1/payments/create/bkash`

```json
{
	"applicationId": "application-uuid",
	"invoiceId": "invoice-uuid"
}
```

The service determines the payment amount from the referenced application or invoice and returns the bKash checkout information. The gateway later calls the public callback route.

## Business Workflows

### Tenant rental workflow

1. Register as `TENANT` or log in.
2. Browse properties with `GET /properties` and room inventory with `GET /properties/flat`.
3. Submit a viewing request for a room.
4. Track the request. The owner can approve, reject, or provide a counter date.
5. Submit an application with the room, move-in date, lease mode, and agreed rent.
6. The owner reviews and updates the application status.
7. After approval, the tenant can access occupancy details and pay invoices through bKash.

### Owner listing workflow

1. Register or log in as `OWNER`.
2. Create a property.
3. Add a flat and one or more rooms, or add rooms later.
4. Keep room rent, capacity, booking mode, and availability current.
5. Review viewing requests and applications for owned properties.
6. Create monthly invoices for room occupants.
7. Review payment history and gateway status.

### Admin workflow

1. Use seeded admin credentials or an account provisioned outside public registration.
2. Review users through `/auth/users-list`, using pagination and role/status filters.
3. Review deleted properties through `/properties/is-deleted`.
4. Manage applications, invoices, and viewing requests where admin authorization is required.
5. Remove payments only when the administrative operation is justified.

## Domain Enums

| Enum | Values |
| --- | --- |
| `Role` | `ADMIN`, `OWNER`, `TENANT` |
| `UserStatus` | `ACTIVE`, `BLOCKED`, `DELETED` |
| `ApplicationStatus` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `RoomViewingStatus` | `PENDING`, `OWNER_RESCHEDULED`, `APPROVED`, `REJECTED` |
| `BookingMode` | `BOOK_BY_ROOM`, `BOOK_BY_SEAT` |
| `InvoiceType` | `COMBINED_RENT_UTILITY`, `MAINTENANCE_FEE` |
| `BillStatus` | `UNPAID`, `PAID`, `OVERDUE` |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `CANCEL`, `FAILED` |
| `PaymentProvider` | `CARD`, `BKASH` |

## Database and Prisma

The Prisma schema is split into domain files under `prisma/schema`, including users, profiles, properties, flats, rooms, applications, room occupants, viewing requests, invoices, and payments. Generated Prisma code is stored under `src/generated/prisma`.

After changing a schema file:

```bash
pnpm exec prisma migrate dev --name describe_your_change
pnpm prisma generate
```

The server connects to PostgreSQL before starting. A failed database or Redis connection prevents the HTTP server from listening.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the TypeScript watch server |
| `pnpm build` | Build the server with tsup |
| `pnpm start` | Run the compiled server |
| `pnpm db:seeds` | Insert default development users/data |
| `pnpm db:delete_seeds` | Remove default seed data |
| `pnpm format:check` | Check Biome formatting under `src` |
| `pnpm format:fix` | Apply Biome formatting under `src` |
| `pnpm lint:check` | Run Biome lint checks under `src` |
| `pnpm lint:fix` | Apply Biome lint fixes under `src` |

There is currently no automated test command configured; `pnpm test` exits with a placeholder error. Use the Postman collection in `src/api_doc/Housing & Roommate Platform.postman_collection.json` as an additional manual API reference.

# 👨‍💻 Author
### Name: Pranta Barua
### Assignment: 6
### Batch: L2B7