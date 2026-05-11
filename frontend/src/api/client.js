import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const cleanData = async (actions) => {
  const res = await axios.post(`${API_BASE}/clean`, actions);
  return res.data;
};

export const getMetrics = async (column_name, metric_type) => {
  const res = await axios.post(`${API_BASE}/metrics`, { column_name, metric_type });
  return res.data;
};

export const generateChart = async (config) => {
  const res = await axios.post(`${API_BASE}/charts`, config);
  return res.data;
};

export const runML = async (payload) => {
  const res = await axios.post(`${API_BASE}/ml/run`, payload);
  return res.data;
};

export const trainDL = async (payload) => {
  const res = await axios.post(`${API_BASE}/dl/train`, payload);
  return res.data;
};

export const getSummary = async () => {
  const res = await axios.get(`${API_BASE}/summary`);
  return res.data;
};

export const loadDemo = async (datasetName) => {
  const res = await axios.get(`${API_BASE}/load-demo/${datasetName}`);
  return res.data;
};

