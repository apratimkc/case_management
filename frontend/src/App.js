import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Card, Table } from 'react-bootstrap';
import ExistingCases from './ExistingCases';
import './App.css';

function App() {
  const [cases, setCases] = useState([]);
  const [message, setMessage] = useState('');
  const [draftCases, setDraftCases] = useState([]);
  const [category, setCategory] = useState('FREE');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get('/cases/');
      setCases(response.data);
    } catch (error) {
      console.error('Error fetching cases:', error);
    }
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMessage(text);
    } catch (error) {
      console.error('Failed to read clipboard contents: ', error);
    }
  };

  const handleExtract = async () => {
    try {
      const response = await axios.post('/extract-case-no/', { text: message });
      let extractedCases = response.data.cases;
      let lastSource = null;
      extractedCases.forEach(c => {
        if (c.source) {
          lastSource = c.source;
        } else if (lastSource) {
          c.source = lastSource;
        }
      });
      setDraftCases(extractedCases);
    } catch (error) {
      console.error('Error extracting cases:', error);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleImageExtract = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('/extract-case-no-from-image/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      let extractedCases = response.data.cases;
      let lastSource = null;
      extractedCases.forEach(c => {
        if (c.source) {
          lastSource = c.source;
        } else if (lastSource) {
          c.source = lastSource;
        }
      });
      setDraftCases(extractedCases);
    } catch (error) {
      console.error('Error extracting cases from image:', error);
    }
  };

  const handleDraftCaseChange = (index, field, value) => {
    const updatedDrafts = [...draftCases];
    updatedDrafts[index][field] = value;
    setDraftCases(updatedDrafts);
  };

  const handleSaveCase = async (draftCase) => {
    try {
      await axios.post('/cases/', { ...draftCase, category });
      setDraftCases(draftCases.filter(c => c.case_no !== draftCase.case_no));
      fetchCases();
    } catch (error) {
      console.error('Error creating case:', error);
    }
  };

  const handleSaveAll = async () => {
    try {
      for (const draft of draftCases) {
        await axios.post('/cases/', { ...draft, category });
      }
      setDraftCases([]);
      fetchCases();
    } catch (error) {
      console.error('Error saving all cases:', error);
    }
  };

  const markComplete = async (caseId) => {
    try {
      await axios.put(`/cases/${caseId}/complete`);
      fetchCases();
    } catch (error) {
      console.error('Error marking case as complete:', error);
    }
  };

  return (
    <Container fluid className="App">
      <Row>
        <Col md={6}>
          <Card className="my-3">
            <Card.Body>
              <Card.Title>Extract Cases from Message</Card.Title>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Paste message here"
                />
              </Form.Group>
              <Button variant="secondary" onClick={handlePaste} className="mt-2 me-2">
                Paste from Clipboard
              </Button>
              <Button variant="primary" onClick={handleExtract} className="mt-2">
                Extract Case Information
              </Button>
            </Card.Body>
          </Card>
          <Card className="my-3">
            <Card.Body>
              <Card.Title>Extract Cases from Image</Card.Title>
              <Form.Group>
                <Form.Control type="file" onChange={handleFileChange} />
              </Form.Group>
              <Button variant="primary" onClick={handleImageExtract} className="mt-2">
                Extract from Image
              </Button>
            </Card.Body>
          </Card>
          {draftCases.length > 0 && (
            <Card className="my-3">
              <Card.Body>
                <Card.Title>Draft Cases</Card.Title>
                <Form.Group as={Row}>
                  <Form.Label column sm="2">Category</Form.Label>
                  <Col sm="10">
                    <Form.Control as="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option>FREE</option>
                      <option>PAID</option>
                    </Form.Control>
                  </Col>
                </Form.Group>
                <Table striped bordered hover responsive className="mt-3">
                  <thead>
                    <tr>
                      <th>Case No</th>
                      <th>Source</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftCases.map((draft, index) => (
                      <tr key={draft.case_no}>
                        <td>
                          <Form.Control
                            type="text"
                            value={draft.case_no}
                            onChange={(e) => handleDraftCaseChange(index, 'case_no', e.target.value)}
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            value={draft.source}
                            onChange={(e) => handleDraftCaseChange(index, 'source', e.target.value)}
                          />
                        </td>
                        <td>
                          <Button variant="success" onClick={() => handleSaveCase(draft)}>
                            Save
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Button variant="primary" onClick={handleSaveAll} className="mt-2">
                  Save All
                </Button>
              </Card.Body>
            </Card>
          )}
        </Col>
        <Col md={6}>
          <Card className="my-3">
            <Card.Body>
              <ExistingCases cases={cases} markComplete={markComplete} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;
