/**
 * Proyectos del portafolio. Fuente: README del perfil y repos públicos de
 * github.com/jhossuarodriguez (revisados en octubre de 2026).
 * Cada proyecto tiene su edificio en el pueblo (ver `src/game/world/primada.ts`).
 */

export type ProjectCategory = 'web' | 'fullstack' | 'dotnet' | 'ios';
export type ProjectStatus = 'live' | 'code' | 'in-progress';

export interface Project {
  readonly id: string;
  readonly name: string;
  /** Una línea: se usa en diálogos y tarjetas. */
  readonly tagline: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly stack: readonly string[];
  readonly category: ProjectCategory;
  readonly status: ProjectStatus;
  readonly liveUrl?: string;
  readonly repoUrl?: string;
}

export const CATEGORY_LABELS: Readonly<Record<ProjectCategory, string>> = {
  web: 'Sitio web',
  fullstack: 'Full-stack',
  dotnet: '.NET',
  ios: 'iOS',
};

export const STATUS_LABELS: Readonly<Record<ProjectStatus, string>> = {
  live: 'En producción',
  code: 'Código abierto',
  'in-progress': 'En desarrollo',
};

const GITHUB = 'https://github.com/jhossuarodriguez';

const PROJECT_LIST = [
  {
    id: 'administrador-de-licencias',
    name: 'Administrador de Licencias',
    tagline: 'Gestión de licencias de software con dashboard y estadísticas.',
    description:
      'Sistema de gestión de licencias de software con dashboard, estadísticas y login con GitHub/Google. Dockerizado, con pipeline CI/CD en Jenkins y tests E2E.',
    highlights: ['Login social con GitHub y Google', 'Dashboard con estadísticas', 'Docker + CI/CD en Jenkins + E2E'],
    stack: ['Next.js', 'Prisma', 'PostgreSQL', 'Better Auth', 'Playwright', 'Docker', 'Jenkins'],
    category: 'fullstack',
    status: 'live',
    liveUrl: 'https://administrador-de-licencias.vercel.app/',
    repoUrl: `${GITHUB}/administrador-de-licencias`,
  },
  {
    id: 'mimes',
    name: 'MiMes',
    tagline: 'Finanzas personales para iPhone, pensada para RD.',
    description:
      'App de finanzas personales para iPhone pensada para República Dominicana (DOP por defecto): gastos, ingresos, presupuestos por categoría, reportes, widget y registro automático con Atajos de iOS.',
    highlights: [
      'Pesos dominicanos (DOP) por defecto',
      'Presupuestos por categoría y reportes',
      'Widget y registro con Atajos de iOS',
    ],
    stack: ['SwiftUI', 'SwiftData', 'Supabase'],
    category: 'ios',
    status: 'code',
    repoUrl: `${GITHUB}/MiMes`,
  },
  {
    id: 'managero-rd',
    name: 'Managero RD',
    tagline: 'Sitio bilingüe de la agencia Managero RD.',
    description: 'Sitio de la agencia Managero RD, bilingüe (ES/EN), con SEO técnico y formulario de contacto.',
    highlights: ['Bilingüe ES/EN', 'SEO técnico', 'Formulario de contacto con Resend'],
    stack: ['Astro', 'Tailwind CSS', 'Resend'],
    category: 'web',
    status: 'live',
    liveUrl: 'https://www.managerord.com',
    repoUrl: `${GITHUB}/managerord`,
  },
  {
    id: 'postesados-jhp',
    name: 'Postesados JHP',
    tagline: 'Sitio corporativo para una empresa de postensado.',
    description:
      'Sitio corporativo para una empresa de postensado: catálogo de servicios, proyectos, datos estructurados (JSON-LD) y sitemap.',
    highlights: ['Catálogo de servicios y proyectos', 'Datos estructurados JSON-LD', 'Formularios con Astro Actions'],
    stack: ['Astro', 'Tailwind CSS', 'Astro Actions'],
    category: 'web',
    status: 'live',
    liveUrl: 'https://postesados.vercel.app',
    repoUrl: `${GITHUB}/postesados`,
  },
  {
    id: 'maps-for-mom',
    name: 'Maps For Mom',
    tagline: 'Itinerarios de viaje personalizados, sin estrés.',
    description:
      'Plataforma de itinerarios de viaje personalizados con SSR, accesibilidad y optimización de imágenes, pensada para viajeros sin tiempo para planificar.',
    highlights: ['Renderizado en servidor (SSR)', 'Enfoque en accesibilidad', 'Imágenes optimizadas'],
    stack: ['Astro', 'Tailwind CSS', 'Vercel'],
    category: 'web',
    status: 'live',
    liveUrl: 'https://mapsformom.com',
    repoUrl: `${GITHUB}/maps-for-mom`,
  },
  {
    id: 'tenax-construction',
    name: 'Tenax Construction',
    tagline: 'Web corporativa de una constructora dominicana.',
    description:
      'Sitio oficial de Tenax Construction, constructora dominicana dedicada al diseño, construcción, administración y supervisión de obras civiles.',
    highlights: ['Diseño corporativo moderno', 'Optimizado para SEO', 'Formulario de contacto'],
    stack: ['Astro', 'Tailwind CSS', 'React'],
    category: 'web',
    status: 'live',
    liveUrl: 'https://www.tenaxconstruction.com.do/',
    repoUrl: `${GITHUB}/tenax-website`,
  },
  {
    id: 'mariela-managero',
    name: 'Portafolio de Mariela Arias',
    tagline: 'Portafolio de una desarrolladora WordPress y Product Owner.',
    description:
      'Portafolio personal de Mariela Arias, desarrolladora WordPress y Product Owner: diseño minimalista, responsive, con galería de proyectos y contacto.',
    highlights: ['Diseño minimalista y responsive', 'Galería de proyectos', 'Navegación fluida entre secciones'],
    stack: ['Astro', 'Tailwind CSS', 'TypeScript'],
    category: 'web',
    status: 'live',
    liveUrl: 'https://mariela-managero.vercel.app',
    repoUrl: `${GITHUB}/mariela-managero`,
  },
  {
    id: 'sistema-gestor-pacientes',
    name: 'Sistema Gestor de Pacientes',
    tagline: 'Pacientes, citas y médicos para clínicas.',
    description:
      'Sistema para clínicas: gestión de pacientes, citas, médicos y especialidades, con roles y autenticación.',
    highlights: ['Roles y autenticación', 'Citas, médicos y especialidades', 'Arquitectura Onion'],
    stack: ['ASP.NET Core MVC', 'EF Core', 'SQL Server', 'Onion Architecture'],
    category: 'dotnet',
    status: 'code',
    repoUrl: `${GITHUB}/SistemaGestorPacientes`,
  },
  {
    id: 'social-network',
    name: 'Social Network',
    tagline: 'Red social con publicaciones, likes y amistades.',
    description: 'Red social con publicaciones, comentarios, likes, solicitudes de amistad y notificaciones.',
    highlights: ['Publicaciones, comentarios y likes', 'Solicitudes de amistad', 'Notificaciones'],
    stack: ['ASP.NET Core MVC', '.NET 9', 'EF Core', 'SQL Server', 'Onion Architecture'],
    category: 'dotnet',
    status: 'code',
    repoUrl: `${GITHUB}/SocialNetwork`,
  },
  {
    id: 'authentication-web-app',
    name: 'Authentication Web App',
    tagline: 'Inicio de sesión con JWT sobre ASP.NET Core.',
    description:
      'Sistema de inicio de sesión con JSON Web Tokens construido en ASP.NET Core, con Entity Framework Core y SQL Server.',
    highlights: ['Autenticación con JWT Bearer', 'Entity Framework Core', 'SQL Server'],
    stack: ['ASP.NET Core', '.NET 9', 'JWT', 'EF Core', 'SQL Server'],
    category: 'dotnet',
    status: 'code',
    repoUrl: `${GITHUB}/AuthenticationWebApplication`,
  },
  {
    id: 'oficina-virtual',
    name: 'Oficina Virtual',
    tagline: 'Aplicación institucional en construcción.',
    description:
      'Aplicación institucional con flujos de autenticación complejos y una arquitectura pensada para escalar.',
    highlights: ['Flujos de autenticación complejos', 'Arquitectura escalable'],
    stack: [],
    category: 'fullstack',
    status: 'in-progress',
  },
] as const satisfies readonly Project[];

/** Ids válidos de proyecto, derivados de la lista (un typo en el mapa no compila). */
export type ProjectId = (typeof PROJECT_LIST)[number]['id'];

/** La lista con el tipo general `Project` (campos opcionales accesibles en todos). */
export const PROJECTS: readonly (Project & { readonly id: ProjectId })[] = PROJECT_LIST;

export function getProject(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id);
}

export function requireProject(id: string): Project {
  const project = getProject(id);
  if (!project) throw new Error(`Proyecto desconocido: ${id}`);
  return project;
}
