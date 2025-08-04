import React, { useState } from 'react';
import { Table, Button } from 'react-bootstrap';

const ExistingCases = ({ cases, markComplete }) => {
  const [copiedRow, setCopiedRow] = useState(null);
  const pendingCases = cases.filter(c => c.status && c.status.toLowerCase() === 'pending');

  const handleCopy = (caseNo, id) => {
    navigator.clipboard.writeText(caseNo);
    setCopiedRow(id);
  };

  return (
    <div className="existing-cases">
      <h2>Existing Cases</h2>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Case No</th>
            <th>Category</th>
            <th>Source</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {pendingCases.map(c => (
            <tr key={c.id} className={copiedRow === c.id ? 'table-primary' : ''}>
              <td>{c.id}</td>
              <td>{c.case_no}</td>
              <td>{c.category}</td>
              <td>{c.source}</td>
              <td>{c.status}</td>
              <td>
                <Button variant="info" onClick={() => handleCopy(c.case_no, c.id)} className="me-2">
                  Copy
                </Button>
                <Button variant="success" onClick={() => markComplete(c.id)}>
                  Mark Complete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ExistingCases;