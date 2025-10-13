import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== DATABASE CHECK ===');
    
    // Check employees
    const employees = await prisma.employee.findMany({
      include: { skills: { include: { service: true } } },
    });
    
    console.log(`Found ${employees.length} employees`);
    
    employees.forEach((emp, index) => {
      console.log(`\nEmployee ${index + 1}: ${emp.firstName} ${emp.lastName} (ID: ${emp.id})`);
      console.log(`  Skills count: ${emp.skills.length}`);
      
      emp.skills.forEach((skill, skillIndex) => {
        console.log(`    Skill ${skillIndex + 1}: ${skill.service.name} (Service ID: ${skill.service.id})`);
      });
      
      if (emp.skills.length === 0) {
        console.log('    No skills assigned!');
      }
    });
    
    // Check services
    const services = await prisma.service.findMany();
    console.log(`\nFound ${services.length} services:`);
    services.slice(0, 5).forEach((service) => {
      console.log(`  - ${service.name} (ID: ${service.id})`);
    });
    
    // Check employee skills table directly
    const employeeSkills = await prisma.employeeSkill.findMany();
    console.log(`\nFound ${employeeSkills.length} employee-skill relationships`);
    
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();