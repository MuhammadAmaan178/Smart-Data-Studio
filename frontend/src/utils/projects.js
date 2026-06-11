import axios from 'axios';
import { getAuthHeader } from './auth';

const BASE_URL = 'http://localhost:5000/api/projects';

export const fetchProjects = async () => {
  const res = await axios.get(`${BASE_URL}/list`, {
    headers: getAuthHeader()
  });
  return res.data;
};

export const saveProject = async (projectName, configuration, projectId = null) => {
  const res = await axios.post(`${BASE_URL}/save`, {
    project_name: projectName,
    configuration,
    project_id: projectId
  }, {
    headers: getAuthHeader()
  });
  return res.data;
};

export const deleteProject = async (projectId) => {
  await axios.delete(`${BASE_URL}/delete/${projectId}`, {
    headers: getAuthHeader()
  });
};
