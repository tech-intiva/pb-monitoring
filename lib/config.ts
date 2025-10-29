import yaml from 'js-yaml';
import { MonitorConfig, ProjectConfig } from '@/types';

export async function loadConfig(): Promise<MonitorConfig> {
  try {
    const response = await fetch('/config/monitor.yaml');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    const text = await response.text();
    const data = yaml.load(text) as any;

    const projects: ProjectConfig[] = Object.entries(data.projects || {}).map(
      ([id, projectData]: [string, any]) => ({
        id,
        name: projectData.name || id,
        accent: getProjectAccent(id),
        hosts: (projectData.hosts || []).map((ip: string) => ({ ip })),
      })
    );

    return { projects };
  } catch (error) {
    console.error('Failed to load config:', error);
    return { projects: [] };
  }
}

function getProjectAccent(projectId: string): string {
  const id = projectId.toLowerCase();
  if (id.includes('cyclops')) return '#1877F2'; // Azure Blue
  if (id.includes('defiant') || id.includes('volvo')) return '#00FEA8'; // Neon Mint
  if (id.includes('skyarmy')) return '#F42D2D'; // Crimson Red (both v1 and v2)
  if (id.includes('enigma')) return '#FE9F00'; // Amber Orange
  if (id.includes('deimos')) return '#D92F20'; // Vermilion Red
  return '#1877F2'; // fallback to Azure Blue
}
