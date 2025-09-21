import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Navigation from '../components/Navigation';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  
  // Dummy data for leads
  const dummyLeads = [
    { id: 1, name: 'John Smith', phone: '021 123 4567', email: 'john@example.com', make: 'Toyota', model: 'Corolla', condition: 'Running', source: 'Facebook' },
    { id: 2, name: 'Sarah Johnson', phone: '022 234 5678', email: 'sarah@example.com', make: 'Honda', model: 'Civic', condition: 'Not Running', source: 'Google' },
    { id: 3, name: 'Mike Brown', phone: '027 345 6789', email: 'mike@example.com', make: 'Ford', model: 'Falcon', condition: 'Scrap', source: 'Instagram' },
    { id: 4, name: 'Emma Wilson', phone: '021 456 7890', email: 'emma@example.com', make: 'Nissan', model: 'Skyline', condition: 'Running', source: 'Facebook' },
    { id: 5, name: 'David Lee', phone: '022 567 8901', email: 'david@example.com', make: 'Mazda', model: 'RX-7', condition: 'Parted Out', source: 'Other' },
    { id: 6, name: 'Lisa Taylor', phone: '027 678 9012', email: 'lisa@example.com', make: 'Subaru', model: 'Impreza', condition: 'Not Running', source: 'Google' },
    { id: 7, name: 'James Davis', phone: '021 789 0123', email: 'james@example.com', make: 'Mitsubishi', model: 'Lancer', condition: 'Running', source: 'Facebook' },
    { id: 8, name: 'Anna White', phone: '022 890 1234', email: 'anna@example.com', make: 'Holden', model: 'Commodore', condition: 'Scrap', source: 'Instagram' }
  ];
  
  // Data for traffic sources chart
  const trafficData = [
    { name: 'Facebook', value: 3 },
    { name: 'Google', value: 2 },
    { name: 'Instagram', value: 2 },
    { name: 'Other', value: 1 }
  ];
  
  // Data for leads per week chart
  const weeklyData = [
    { week: 'Week 1', leads: 4 },
    { week: 'Week 2', leads: 3 },
    { week: 'Week 3', leads: 5 },
    { week: 'Week 4', leads: 2 }
  ];
  
  const COLORS = ['#1a3c6c', '#ff6b35', '#28a745', '#ffc107'];
  
  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/login');
    } else {
      setLeads(dummyLeads);
    }
  }, [navigate, dummyLeads]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  return (
    <div className="dashboard">
      <Navigation />
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
      
      <div className="dashboard-content">
        <div className="charts-section">
          <div className="chart-container">
            <h2>Traffic Sources</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trafficData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {trafficData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-container">
            <h2>Leads Per Week</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={weeklyData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#1a3c6c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="leads-section">
          <h2>Recent Leads</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Car</th>
                  <th>Condition</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.email}</td>
                    <td>{lead.make} {lead.model}</td>
                    <td>{lead.condition}</td>
                    <td>{lead.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;