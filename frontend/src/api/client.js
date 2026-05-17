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

export const getDLStatus = async () => {
  const res = await axios.get(`${API_BASE}/dl/status`);
  return res.data;
};

export const predictDL = async (payload) => {
  const res = await axios.post(`${API_BASE}/dl/predict`, payload);
  return res.data;
};

export const getDLFeatureBounds = async () => {
  const res = await axios.post(`${API_BASE}/dl/feature-bounds`);
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

export const getMissingInfo = async () => {
  const res = await axios.post(`${API_BASE}/missing-info`);
  return res.data;
};

export const handleMissing = async (payload) => {
  const res = await axios.post(`${API_BASE}/handle-missing`, payload);
  return res.data;
};

export const stringClean = async (payload) => {
  const res = await axios.post(`${API_BASE}/string-clean`, payload);
  return res.data;
};

export const outlierDetect = async (payload) => {
  const res = await axios.post(`${API_BASE}/outlier-detect`, payload);
  return res.data;
};

export const outlierHandle = async (payload) => {
  const res = await axios.post(`${API_BASE}/outlier-handle`, payload);
  return res.data;
};

export const getCleanReport = async () => {
  const res = await axios.post(`${API_BASE}/clean-report`);
  return res.data;
};

export const clearCleanLog = async () => {
  const res = await axios.post(`${API_BASE}/clear-clean-log`);
  return res.data;
};

export const getFullDataset = async () => {
  const res = await axios.get(`${API_BASE}/export`);
  return res.data;
};

export const getCorrelationMatrix = async () => {
  const res = await axios.post(`${API_BASE}/correlation`);
  return res.data;
};

// ── Feature Engineering ──
export const getFeaturesInfo = async () => {
  const res = await axios.post(`${API_BASE}/features/info`);
  return res.data;
};

export const createFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/create-column`, payload);
  return res.data;
};

export const renameFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/rename-column`, payload);
  return res.data;
};

export const dropFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/drop-column`, payload);
  return res.data;
};

export const binFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/bin-column`, payload);
  return res.data;
};

export const extractDateFeature = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/extract-date`, payload);
  return res.data;
};

export const encodeFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/encode-column`, payload);
  return res.data;
};

export const scaleFeatureColumn = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/scale-column`, payload);
  return res.data;
};

export const stringOpsFeature = async (payload) => {
  const res = await axios.post(`${API_BASE}/features/string-ops`, payload);
  return res.data;
};

export const previewFeatures = async () => {
  const res = await axios.post(`${API_BASE}/features/preview`);
  return res.data;
};

// ── Dashboard ──
export const getDashboardMetrics = async (payload) => {
  const res = await axios.post(`${API_BASE}/dashboard/metrics`, payload);
  return res.data;
};

export const getChartData = async (payload) => {
  const res = await axios.post(`${API_BASE}/dashboard/chart-data`, payload);
  return res.data;
};
