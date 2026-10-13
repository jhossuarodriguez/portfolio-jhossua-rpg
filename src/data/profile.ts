/**
 * Datos personales del portafolio. Edita aquí y se actualiza todo:
 * la pantalla táctil, los diálogos del juego, el SEO y el JSON-LD.
 */

export interface SocialLink {
  readonly id: 'github' | 'linkedin' | 'email' | 'x' | 'instagram';
  readonly label: string;
  readonly handle: string;
  readonly url: string;
}

export interface ExperienceItem {
  readonly role: string;
  readonly organization: string;
  readonly detail: string;
}

export interface SkillGroup {
  readonly title: string;
  readonly items: readonly string[];
}

export const PROFILE = {
  name: 'Jhossua Roa Rodriguez',
  shortName: 'Jhossua',
  role: 'Software Engineer',
  location: 'Santo Domingo, República Dominicana',
  /** Bio del perfil de GitHub. */
  motto: 'La mayor parte de mi tiempo se va en lo que el usuario no ve, pero siempre siente.',
  bio: 'Apasionado por el desarrollo web moderno y por las interfaces impecables. Combino mi gusto por la estética retro 8-bit con un rendimiento web optimizado y preciso.',
  experience: [
    {
      role: 'Frontend Developer',
      organization: 'CAID',
      detail: 'Centro de Atención Integral para la Discapacidad · Santo Domingo',
    },
    {
      role: 'Desarrollador freelance',
      organization: 'Managero RD',
      detail: 'Sitios y landing pages para clientes de la agencia',
    },
  ] satisfies readonly ExperienceItem[],
  education: [
    {
      role: 'Desarrollo de Software',
      organization: 'ITLA',
      detail: 'Instituto Tecnológico de Las Américas',
    },
  ] satisfies readonly ExperienceItem[],
  skills: [
    { title: 'Frontend', items: ['React', 'Next.js', 'Astro', 'TypeScript', 'JavaScript', 'Tailwind CSS'] },
    { title: 'Backend y datos', items: ['Prisma', 'PostgreSQL', 'Supabase', 'Zod', 'C# / .NET', 'SQL Server'] },
    { title: 'iOS', items: ['SwiftUI', 'SwiftData'] },
    { title: 'Calidad y DevOps', items: ['Vitest', 'Playwright', 'Docker', 'Jenkins', 'Git'] },
  ] satisfies readonly SkillGroup[],
  links: [
    { id: 'github', label: 'GitHub', handle: 'jhossuarodriguez', url: 'https://github.com/jhossuarodriguez' },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      handle: 'in/jhossuarodriguez',
      url: 'https://www.linkedin.com/in/jhossuarodriguez',
    },
    {
      id: 'email',
      label: 'Correo',
      handle: 'jhossuarodriguezz@gmail.com',
      url: 'mailto:jhossuarodriguezz@gmail.com',
    },
    { id: 'x', label: 'X', handle: '@jhossuarevenge', url: 'https://x.com/jhossuarevenge' },
    {
      id: 'instagram',
      label: 'Instagram',
      handle: '@jhossuarodriguezz',
      url: 'https://www.instagram.com/jhossuarodriguezz',
    },
  ] satisfies readonly SocialLink[],
} as const;
