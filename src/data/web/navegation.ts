export interface NavegationItems {
    label: string,
    href: string,
    class?: string
}

export const navItems: readonly NavegationItems[] = [
    { label: "Inicio", href: "/"},
    { label: "Pokedex", href: "/pokedex" },
    { label: "Ciudades", href: "/ciudades" },
    { label: "Contacto", href: "/contacto"}
]