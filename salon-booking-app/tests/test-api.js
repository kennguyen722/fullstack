const fetch = require('node-fetch');

async function testEmployeesAPI() {
  try {
    console.log('Testing public employees API...');
    const response = await fetch('http://localhost:4301/api/public/employees');
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      return;
    }
    
    const employees = await response.json();
    console.log('API Response:');
    console.log('Number of employees:', employees.length);
    
    employees.forEach((emp, index) => {
      console.log(`\nEmployee ${index + 1}: ${emp.firstName} ${emp.lastName}`);
      console.log('  ID:', emp.id);
      console.log('  Skills:', emp.skills ? emp.skills.length : 'undefined');
      
      if (emp.skills && emp.skills.length > 0) {
        emp.skills.forEach((skill, skillIndex) => {
          console.log(`    Skill ${skillIndex + 1}: ${skill.service.name} (ID: ${skill.service.id})`);
        });
      } else {
        console.log('    No skills found!');
      }
    });
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testEmployeesAPI();