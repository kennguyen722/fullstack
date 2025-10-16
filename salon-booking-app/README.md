
# Salon Booking App

## Professional Overview

**Salon Booking App** is a modern, centralized platform designed for beauty and salon businesses to manage online appointment bookings, streamline staff and service management, and gain actionable insights into business performance. Whether you run a nail salon, hair studio, spa, or multi-service beauty business, this application provides a robust, user-friendly solution to digitize your operations and empower your team and clients.

### Purpose & Value
- **Centralized Booking:** Unify all appointment scheduling for services and staff, reducing double-booking and manual errors.
- **Business Intelligence:** Track client activity, service popularity, revenue, and staff performance with built-in analytics and charts.
- **Client Experience:** Offer seamless online booking, reminders, and birthday notifications to enhance client retention and satisfaction.
- **Staff & Admin Tools:** Role-based dashboards for employees and admins, including shift management, service assignment, and profile controls.

## Application Structure

The project is organized as a fullstack monorepo with three main areas:

- **server/** — Node.js/Express backend (TypeScript, Prisma ORM, SQLite)
- **client/** — React SPA frontend (Vite, TypeScript, Bootstrap 5)
- **prisma/** — Database schema and migrations

### Directory Layout

```
salon-booking-app/
├── client/
│   ├── src/
│   │   ├── pages/           # Main UI pages (Booking, Appointments, Clients, Employees, Shifts, etc.)
│   │   ├── shared/          # Shared utilities (API, auth, context)
│   │   └── theme.css        # Custom theme and utility classes
│   ├── public/              # Static assets
│   ├── package.json         # Frontend dependencies
│   └── vite.config.ts       # Vite configuration
├── server/
│   ├── src/
│   │   ├── index.ts         # Express API entrypoint
│   │   ├── config.ts        # Server config
│   │   ├── types/           # Type definitions
│   │   └── prisma/          # Prisma client
│   ├── package.json         # Backend dependencies
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/      # Migration history
│   └── Dockerfile           # (Optional) containerization
└── README.md                # Project documentation
```

## Configuration

### Environment Variables
- **server/.env** — Configure API port, database path, JWT secret, and CORS origins.
	- Example:
		```
		PORT=4301
		DATABASE_URL="file:./salonBookingApp.db"
		JWT_SECRET="your_secret_key"
		CLIENT_URL="http://localhost:5301"
		CORS_ORIGINS="http://localhost:5301"
		```

### Database
- Uses **SQLite** for easy local development. For production, you can switch to PostgreSQL or MySQL by updating `schema.prisma` and `DATABASE_URL`.

## Build & Setup Instructions

### 1. Install Dependencies

```sh
cd server
npm install
cd ../client
npm install
```

### 2. Initialize Database & Seed Admin

```sh
cd ../server
npx prisma migrate dev --name init
npm run seed
```

### 3. Build the Application

#### Build Server
```sh
cd server
npm run build
```

#### Build Client
```sh
cd ../client
npm run build
```

### 4. Run in Development Mode

#### Start API Server
```sh
cd server
npm run dev
```

#### Start Client (in a separate terminal)
```sh
cd client
npm run dev
```

### 5. Access the Application

- **Client UI:** [http://localhost:5301](http://localhost:5301)
- **API Server:** [http://localhost:4301](http://localhost:4301)

### 6. Admin Login (Seeded User)

- **Email:** admin@salon.local
- **Password:** Admin123!

## Features & Capabilities

- **Online Booking:** Public booking form for clients (service, staff, date/time, birthday, email, phone required)
- **Role-Based Dashboards:**
	- Admin: Manage employees, services, prices, shifts, and view business analytics
	- Employee: View own appointments, shifts, and update profile
- **Client Analytics:**
	- Per-client history, statistics, most popular services, birthday reminders
	- Overall business KPIs: total bookings, revenue, top services, repeat rate
	- Inline SVG charts for monthly trends
- **Shift & Service Management:** Assign staff to services, generate shifts, and manage availability
- **Avatar & Profile Management:** Staff and admin can upload/remove profile photos
- **Modern UI:** Responsive, themeable, with sidebar tooltips and sticky filters

## Advanced Usage

- **Production Deployment:**
	- Use Dockerfiles in `client/` and `server/` for containerization
	- Update environment variables for production database and secure JWT
- **Database Migration:**
	- To apply new schema changes:
		```sh
		cd server
		npx prisma migrate dev --name <migration_name>
		```
- **Customizing Services & Employees:**
	- Use the admin dashboard to add/edit services, assign staff, and set prices

## Support & Contribution

For issues, feature requests, or contributions, please open an issue or pull request on GitHub.

---

**Salon Booking App** — Empowering beauty businesses to grow, delight clients, and make data-driven decisions.
