'use client'

import { AuthGuard } from '@/components/auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { BookOpen, Users, ClipboardCheck, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const features = [
    {
      id: 'materias',
      title: 'Materias',
      description: 'Gestiona las materias y asigna profesores',
      href: '/materias',
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'alumnos',
      title: 'Alumnos',
      description: 'Importa y gestiona alumnos de las materias',
      href: '/materias',
      icon: Users,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'asistencia',
      title: 'Asistencia',
      description: 'Toma de asistencia rápida y eficiente',
      href: '/asistencia',
      icon: ClipboardCheck,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'informes',
      title: 'Informes',
      description: 'Reportes de asistencia y estadísticas',
      href: '/informes',
      icon: BarChart3,
      color: 'bg-orange-100 text-orange-600',
    },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-slate-900">Bienvenido</h1>
            <p className="mt-2 text-lg text-slate-600">
              Sistema de gestión de asistencia para la UTN
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link key={feature.id} href={feature.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Acciones rápidas</CardTitle>
                <CardDescription>Realiza las tareas más comunes</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/asistencia">Tomar asistencia</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/materias">Crear materia</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/informes">Ver informes</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
