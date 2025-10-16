const axios = require('axios');

const api = axios.create({ 
  baseURL: 'http://localhost:4301/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

async function test() {
  try {
    // First, login as admin
    console.log('Logging in as admin...');
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@salon.local',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    api.defaults.headers.Authorization = `Bearer ${token}`;
    console.log('Login successful!');
    
    // Test loading employees
    console.log('\nLoading employees...');
    const employeesResponse = await api.get('/employees');
    console.log('Current employees:', employeesResponse.data.length);
    employeesResponse.data.forEach(emp => {
      console.log(`- ${emp.firstName} ${emp.lastName} (${emp.user?.email})`);
    });
    
    // Test creating new employee
    console.log('\nCreating new employee...');
    const newEmployee = {
      firstName: 'Test',
      lastName: 'Employee',
      email: 'test@salon.local',
      phone: '(555) 999-0000',
      bio: 'This is a test employee',
      password: 'TestPass123!',
      role: 'EMPLOYEE',
      serviceIds: []
    };
    
    const createResponse = await api.post('/employees', newEmployee);
    console.log('Employee created:', createResponse.data);
    
    // Load employees again to verify
    console.log('\nLoading employees after creation...');
    const updatedEmployeesResponse = await api.get('/employees');
    console.log('Updated employee count:', updatedEmployeesResponse.data.length);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

test();