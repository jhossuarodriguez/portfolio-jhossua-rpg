import { describe, expect, it } from 'vitest';
import { PROFILE } from '../../src/data/profile.ts';
import { CATEGORY_LABELS, getProject, PROJECTS, requireProject, STATUS_LABELS } from '../../src/data/projects.ts';

describe('proyectos', () => {
  it('tienen ids únicos en formato slug', () => {
    const ids = PROJECTS.map((project) => project.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(PROJECTS.map((project) => [project.id, project] as const))('%s está completo y coherente', (_, project) => {
    expect(project.name.length).toBeGreaterThan(2);
    expect(project.tagline.length).toBeLessThanOrEqual(70);
    expect(project.description.length).toBeGreaterThan(project.tagline.length);
    expect(project.highlights.length).toBeGreaterThan(0);
    expect(CATEGORY_LABELS[project.category]).toBeDefined();
    expect(STATUS_LABELS[project.status]).toBeDefined();
    if (project.status === 'live') expect(project.liveUrl).toMatch(/^https:\/\//);
    if (project.status !== 'in-progress') expect(project.stack.length).toBeGreaterThan(0);
    if (project.repoUrl) expect(project.repoUrl).toMatch(/^https:\/\/github\.com\/jhossuarodriguez\/[\w.-]+$/);
    for (const url of [project.liveUrl, project.repoUrl]) {
      if (url) expect(() => new URL(url)).not.toThrow();
    }
  });

  it('getProject y requireProject', () => {
    expect(getProject('mimes')?.name).toBe('MiMes');
    expect(getProject('no-existe')).toBeUndefined();
    expect(() => requireProject('no-existe')).toThrow('Proyecto desconocido');
  });
});

describe('perfil', () => {
  it('tiene enlaces válidos y el correo como mailto', () => {
    for (const link of PROFILE.links) {
      expect(() => new URL(link.url)).not.toThrow();
      if (link.id === 'email') expect(link.url).toBe(`mailto:${link.handle}`);
      else expect(link.url).toMatch(/^https:\/\//);
    }
  });

  it('tiene experiencia, formación y habilidades', () => {
    expect(PROFILE.experience.length).toBeGreaterThan(0);
    expect(PROFILE.education.length).toBeGreaterThan(0);
    expect(PROFILE.skills.flatMap((group) => group.items)).toContain('TypeScript');
  });
});
