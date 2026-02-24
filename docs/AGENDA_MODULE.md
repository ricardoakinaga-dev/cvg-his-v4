# Agenda Module - CVG-HIS

## Overview

The Agenda module provides a complete appointment scheduling system for veterinary hospitals, supporting multiple professionals, resources, and appointment types.

## Features

- **Multi-professional scheduling**: Veterinarians, specialists, anesthesists, and support staff
- **Resource management**: Consultation rooms, surgery rooms, equipment
- **Flexible appointment types**: Consultations, follow-ups, surgeries, exams
- **Conflict detection**: Prevents double-booking with overbook permission option
- **Availability management**: Weekly schedules, breaks, and time-off
- **Team assignments**: Support for surgeries with multiple team members
- **Audit trail**: Complete history of all changes

## Database Models

### collaborators
Stores information about professionals who can have appointments.

### collaborator_availability
Weekly recurring availability for each collaborator.

### collaborator_time_off
Exceptions to regular availability (vacations, days off).

### resources
Bookable resources (rooms, equipment).

### appointment_types
Types of appointments that can be scheduled.

### appointments
Individual appointment records.

### appointment_team
Team members for appointments (e.g., surgery team).

## API Endpoints

### Appointments
- GET /agenda/appointments - List appointments with filters
- GET /agenda/appointments/:id - Get appointment details
- POST /agenda/appointments - Create appointment
- PUT /agenda/appointments/:id - Update appointment
- POST /agenda/appointments/:id/cancel - Cancel appointment
- POST /agenda/appointments/:id/confirm - Confirm appointment

### Availability
- GET /agenda/availability/slots - Get available time slots
- GET /agenda/availability - Get collaborator availability
- PUT /agenda/availability - Update availability
- POST /agenda/availability/time-off - Create time-off
- DELETE /agenda/availability/time-off/:id - Delete time-off

### Collaborators
- GET /agenda/collaborators - List collaborators
- GET /agenda/collaborators/:id - Get collaborator
- POST /agenda/collaborators - Create collaborator
- PUT /agenda/collaborators/:id - Update collaborator

### Resources
- GET /agenda/resources - List resources
- POST /agenda/resources - Create resource
- PUT /agenda/resources/:id - Update resource

### Appointment Types
- GET /agenda/appointment-types - List types
- POST /agenda/appointment-types - Create type
- PUT /agenda/appointment-types/:id - Update type

## Permissions

| Permission | Description |
|------------|-------------|
| agenda.agendamentos.read | View appointments |
| agenda.agendamentos.create | Create appointments |
| agenda.agendamentos.update | Update appointments |
| agenda.agendamentos.cancel | Cancel appointments |
| agenda.agendamentos.overbook | Override conflict detection |
| agenda.colaboradores.read | View collaborators |
| agenda.colaboradores.update | Manage collaborators |
| agenda.recursos.read | View resources |
| agenda.recursos.update | Manage resources |
| agenda.config.read | View appointment types |
| agenda.config.update | Manage appointment types |

## Conflict Detection

The system uses the overlap formula to detect conflicts:
```
existing_start < new_end AND existing_end > new_start
```

Conflicts are detected for:
1. Collaborator conflicts: Same professional double-booked
2. Resource conflicts: Same room/resource double-booked

Appointments with status `canceled` or `no_show` are excluded from conflict checks.

## Frontend Routes

| Route | Description |
|-------|-------------|
| /agenda | Calendar view |
| /agenda/agendamentos | Appointments list |
| /agenda/agendamentos/novo | Create appointment |
| /agenda/agendamentos/[id] | Appointment details |
| /agenda/colaboradores | Collaborators management |
| /agenda/recursos | Resources management |
| /agenda/tipos | Appointment types management |
