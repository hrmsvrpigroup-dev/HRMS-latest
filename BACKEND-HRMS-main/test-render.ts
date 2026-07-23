import axios from 'axios';

async function testRenderBackend() {
  try {
    const res = await axios.post('https://hrms-6-otg8.onrender.com/api/auth/login', {
      email: 'sandeepkumar.pikili@vrpigroup.co.in',
      password: 'Sandeep@VRPI'
    });
    
    const token = res.data.data.accessToken;
    console.log('Login successful.');

    // Fetch companies to get an ID
    const companiesRes = await axios.get('https://hrms-6-otg8.onrender.com/api/superadmin/companies', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const company = companiesRes.data.data[0];
    if (!company) {
      console.log('No companies found.');
      return;
    }
    
    console.log('Testing document request for company:', company.id);
    const docRes = await axios.post(`https://hrms-6-otg8.onrender.com/api/superadmin/companies/${company.id}/document-request`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Doc request success:', docRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testRenderBackend();
