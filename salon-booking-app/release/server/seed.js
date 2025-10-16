import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@salon.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
        const hash = await bcrypt.hash(adminPassword, 10);
        const admin = await prisma.user.create({ data: { email: adminEmail, password: hash, role: 'ADMIN' } });
        await prisma.employee.create({ data: { userId: admin.id, firstName: 'Admin', lastName: 'User' } });
    }
    // Seed categories
    const categories = [
        { name: 'Nails', desc: 'Manicure and pedicure services' },
        { name: 'Hair', desc: 'Haircut, color, styling' },
        { name: 'Eyelash', desc: 'Eyelash extensions and fills' },
        { name: 'Facial', desc: 'Facial treatments' },
        { name: 'Beauty', desc: 'General beauty services' },
    ];
    for (const c of categories) {
        await prisma.serviceCategory.upsert({
            where: { name: c.name },
            update: {},
            create: c,
        });
    }
    const catByName = Object.fromEntries((await prisma.serviceCategory.findMany()).map((c) => [c.name, c]));
    // Seed services
    const services = [
        // Nails
        { name: 'Classic Manicure', description: 'Traditional nail care with polish', priceCents: 2500, durationMin: 30, categoryId: catByName['Nails'].id },
        { name: 'Gel Manicure', description: 'Long-lasting gel polish manicure', priceCents: 3500, durationMin: 45, categoryId: catByName['Nails'].id },
        { name: 'Classic Pedicure', description: 'Traditional pedicure with polish', priceCents: 3000, durationMin: 45, categoryId: catByName['Nails'].id },
        { name: 'Deluxe Pedicure', description: 'Luxury pedicure with massage and exfoliation', priceCents: 4500, durationMin: 60, categoryId: catByName['Nails'].id },
        { name: 'Nail Art', description: 'Custom nail art and designs', priceCents: 2000, durationMin: 30, categoryId: catByName['Nails'].id },
        // Hair
        { name: 'Women Haircut', description: 'Professional haircut and styling', priceCents: 4500, durationMin: 45, categoryId: catByName['Hair'].id },
        { name: 'Men Haircut', description: 'Classic men\'s haircut', priceCents: 3000, durationMin: 30, categoryId: catByName['Hair'].id },
        { name: 'Hair Color', description: 'Full hair coloring service', priceCents: 8000, durationMin: 120, categoryId: catByName['Hair'].id },
        { name: 'Highlights', description: 'Hair highlighting service', priceCents: 6500, durationMin: 90, categoryId: catByName['Hair'].id },
        { name: 'Blowout', description: 'Professional hair styling and blowout', priceCents: 3500, durationMin: 30, categoryId: catByName['Hair'].id },
        // Eyelash
        { name: 'Classic Lash Extension', description: 'Natural lash extension application', priceCents: 8000, durationMin: 90, categoryId: catByName['Eyelash'].id },
        { name: 'Volume Lash Extension', description: 'Dramatic volume lash extensions', priceCents: 10000, durationMin: 120, categoryId: catByName['Eyelash'].id },
        { name: 'Lash Fill', description: '2-3 week lash extension maintenance', priceCents: 4500, durationMin: 60, categoryId: catByName['Eyelash'].id },
        { name: 'Lash Lift', description: 'Natural lash curl and tint', priceCents: 5000, durationMin: 45, categoryId: catByName['Eyelash'].id },
        // Facial
        { name: 'Basic Facial', description: 'Deep cleansing facial treatment', priceCents: 6000, durationMin: 60, categoryId: catByName['Facial'].id },
        { name: 'Anti-Aging Facial', description: 'Advanced anti-aging treatment', priceCents: 9000, durationMin: 75, categoryId: catByName['Facial'].id },
        { name: 'Hydrating Facial', description: 'Moisturizing and hydrating treatment', priceCents: 7000, durationMin: 60, categoryId: catByName['Facial'].id },
        { name: 'Acne Treatment', description: 'Specialized acne treatment facial', priceCents: 7500, durationMin: 60, categoryId: catByName['Facial'].id },
        // Beauty
        { name: 'Eyebrow Shaping', description: 'Professional eyebrow waxing and shaping', priceCents: 2500, durationMin: 30, categoryId: catByName['Beauty'].id },
        { name: 'Eyebrow Tinting', description: 'Eyebrow tinting service', priceCents: 2000, durationMin: 20, categoryId: catByName['Beauty'].id },
        { name: 'Makeup Application', description: 'Professional makeup application', priceCents: 5000, durationMin: 45, categoryId: catByName['Beauty'].id },
        { name: 'Body Waxing', description: 'Professional body waxing service', priceCents: 4000, durationMin: 45, categoryId: catByName['Beauty'].id },
    ];
    for (const s of services) {
        await prisma.service.upsert({
            where: { name_categoryId: { name: s.name, categoryId: s.categoryId } },
            update: {},
            create: s,
        });
    }
    // Seed employees
    const staff = [
        {
            email: 'sarah@salon.local',
            firstName: 'Sarah',
            lastName: 'Johnson',
            phone: '(555) 123-4567',
            bio: 'Experienced nail technician specializing in nail art and gel manicures. 5+ years experience.',
            photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b1a7?w=150&h=150&fit=crop&crop=face'
        },
        {
            email: 'mike@salon.local',
            firstName: 'Mike',
            lastName: 'Chen',
            phone: '(555) 234-5678',
            bio: 'Professional hair stylist and colorist. Specializes in modern cuts and color techniques.',
            photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        },
        {
            email: 'emily@salon.local',
            firstName: 'Emily',
            lastName: 'Rodriguez',
            phone: '(555) 345-6789',
            bio: 'Licensed esthetician and lash technician. Passionate about skincare and beauty.',
            photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        },
        {
            email: 'alex@salon.local',
            firstName: 'Alex',
            lastName: 'Thompson',
            phone: '(555) 456-7890',
            bio: 'Multi-talented stylist offering hair, makeup, and beauty services.',
            photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        },
        {
            email: 'lisa@salon.local',
            firstName: 'Lisa',
            lastName: 'Kim',
            phone: '(555) 567-8901',
            bio: 'Expert in facial treatments and advanced skincare. Certified esthetician.',
            photoUrl: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face'
        }
    ];
    for (const s of staff) {
        const u = await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: { email: s.email, password: await bcrypt.hash('Welcome123!', 10), role: 'EMPLOYEE' },
        });
        await prisma.employee.upsert({
            where: { userId: u.id },
            update: {},
            create: {
                userId: u.id,
                firstName: s.firstName,
                lastName: s.lastName,
                phone: s.phone,
                bio: s.bio,
                photoUrl: s.photoUrl
            },
        });
    }
    // Assign some skills based on specialties
    const allServices = await prisma.service.findMany();
    const allEmployees = await prisma.employee.findMany();
    console.log('=== SKILL ASSIGNMENT DEBUG ===');
    console.log('Total services found:', allServices.length);
    console.log('Total employees found:', allEmployees.length);
    const skillAssignments = [
        { employeeName: 'Sarah Johnson', services: ['Classic Manicure', 'Gel Manicure', 'Classic Pedicure', 'Deluxe Pedicure', 'Nail Art'] },
        { employeeName: 'Mike Chen', services: ['Women Haircut', 'Men Haircut', 'Hair Color', 'Highlights', 'Blowout'] },
        { employeeName: 'Emily Rodriguez', services: ['Classic Lash Extension', 'Volume Lash Extension', 'Lash Fill', 'Lash Lift', 'Basic Facial', 'Eyebrow Shaping'] },
        { employeeName: 'Alex Thompson', services: ['Women Haircut', 'Men Haircut', 'Makeup Application', 'Eyebrow Shaping', 'Eyebrow Tinting'] },
        { employeeName: 'Lisa Kim', services: ['Basic Facial', 'Anti-Aging Facial', 'Hydrating Facial', 'Acne Treatment', 'Eyebrow Tinting'] }
    ];
    for (const emp of allEmployees) {
        const fullName = `${emp.firstName} ${emp.lastName}`;
        const assignment = skillAssignments.find(a => a.employeeName === fullName);
        console.log(`Processing employee: ${fullName}`);
        if (assignment) {
            console.log(`  Found assignment for ${fullName}:`, assignment.services);
            await prisma.employeeSkill.deleteMany({ where: { employeeId: emp.id } });
            const serviceIds = allServices
                .filter(s => assignment.services.includes(s.name))
                .map(s => s.id);
            console.log(`  Service IDs to assign:`, serviceIds);
            if (serviceIds.length) {
                await prisma.employeeSkill.createMany({
                    data: serviceIds.map(sid => ({ employeeId: emp.id, serviceId: sid }))
                });
                console.log(`  Assigned ${serviceIds.length} skills to ${fullName}`);
            }
            else {
                console.log(`  No matching services found for ${fullName}`);
            }
        }
        else {
            console.log(`  No assignment found for ${fullName}`);
        }
    }
    // Add sample shifts (next 7 days, 9 AM - 6 PM)
    await prisma.shift.deleteMany(); // Clear existing shifts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const shiftDate = new Date(today);
        shiftDate.setDate(today.getDate() + dayOffset);
        // Skip Sundays
        if (shiftDate.getDay() === 0)
            continue;
        for (const emp of allEmployees) {
            // Skip admin user
            if (emp.firstName === 'Admin')
                continue;
            // Some employees work different days
            if (emp.firstName === 'Sarah' && [1, 3, 5].includes(shiftDate.getDay()))
                continue; // Mon, Wed, Fri off
            if (emp.firstName === 'Mike' && [2, 4].includes(shiftDate.getDay()))
                continue; // Tue, Thu off
            const startTime = new Date(shiftDate);
            startTime.setHours(9, 0, 0, 0);
            const endTime = new Date(shiftDate);
            endTime.setHours(18, 0, 0, 0);
            await prisma.shift.create({
                data: {
                    employeeId: emp.id,
                    start: startTime,
                    end: endTime
                }
            });
        }
    }
    // Add some sample appointments for today and tomorrow
    await prisma.appointment.deleteMany(); // Clear existing appointments
    const sampleAppointments = [
        {
            employeeName: 'Sarah Johnson',
            serviceName: 'Gel Manicure',
            clientName: 'Jennifer Wilson',
            clientEmail: 'jennifer.w@email.com',
            clientPhone: '(555) 111-2222',
            dayOffset: 0,
            hour: 10
        },
        {
            employeeName: 'Mike Chen',
            serviceName: 'Women Haircut',
            clientName: 'Maria Garcia',
            clientEmail: 'maria.g@email.com',
            clientPhone: '(555) 333-4444',
            dayOffset: 0,
            hour: 14
        },
        {
            employeeName: 'Emily Rodriguez',
            serviceName: 'Classic Lash Extension',
            clientName: 'Ashley Brown',
            clientEmail: 'ashley.b@email.com',
            clientPhone: '(555) 555-6666',
            dayOffset: 1,
            hour: 11
        },
        {
            employeeName: 'Lisa Kim',
            serviceName: 'Anti-Aging Facial',
            clientName: 'Rebecca Davis',
            clientEmail: 'rebecca.d@email.com',
            clientPhone: '(555) 777-8888',
            dayOffset: 1,
            hour: 15
        }
    ];
    for (const appt of sampleAppointments) {
        const employee = allEmployees.find(e => `${e.firstName} ${e.lastName}` === appt.employeeName);
        const service = allServices.find(s => s.name === appt.serviceName);
        if (employee && service) {
            const apptDate = new Date(today);
            apptDate.setDate(today.getDate() + appt.dayOffset);
            apptDate.setHours(appt.hour, 0, 0, 0);
            const endDate = new Date(apptDate);
            endDate.setMinutes(apptDate.getMinutes() + service.durationMin);
            await prisma.appointment.create({
                data: {
                    employeeId: employee.id,
                    serviceId: service.id,
                    clientName: appt.clientName,
                    clientEmail: appt.clientEmail,
                    clientPhone: appt.clientPhone,
                    start: apptDate,
                    end: endDate,
                    status: 'CONFIRMED'
                }
            });
        }
    }
    console.log('Seed complete');
}
main().finally(async () => prisma.$disconnect());
