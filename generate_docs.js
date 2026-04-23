import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import fs from 'fs';
import path from 'path';

const docFolder = 'documentacion';
if (!fs.existsSync(docFolder)) {
    fs.mkdirSync(docFolder);
}

const createDoc = async (filename, title, sections) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: title,
                    heading: HeadingLevel.TITLE,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),
                ...sections.flatMap(s => [
                    new Paragraph({
                        text: s.heading,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 }
                    }),
                    ...(Array.isArray(s.content) ? s.content : [s.content]).map(text => {
                        if (typeof text === 'string') {
                            return new Paragraph({
                                children: [new TextRun(text)],
                                spacing: { after: 120 }
                            });
                        }
                        return text; // Allow pre-constructed docx objects
                    })
                ])
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(docFolder, filename), buffer);
    console.log(`Generated ${filename}`);
};

// 1. Arquitectura del Sistema
createDoc('1_Arquitectura_Sistema.docx', 'Arquitectura del Sistema - TimeTracker', [
    {
        heading: 'Visión General',
        content: 'La plataforma TimeTracker es una aplicación Full-Stack diseñada para la gestión de tiempos, costos y proyectos con capacidades de Inteligencia Artificial.'
    },
    {
        heading: 'Frontend (Client-Side)',
        content: [
            '- Framework: React 18 con Vite.',
            '- Estado Global: Hooks de React (useState, useEffect, useContext).',
            '- Estilizado: Tailwind CSS con variables dinámicas para marca blanca.',
            '- Iconografía: Lucide-React.',
            '- Animaciones: Motion (Framer Motion).',
            '- Visualización de Datos: Recharts y D3.js.',
            '- IA: Integración con Google Gemini SDK (@google/genai).'
        ]
    },
    {
        heading: 'Backend (Server-Side)',
        content: [
            '- Lenguaje: PHP 7.4 / 8.x.',
            '- Arquitectura: RESTful API sin dependencias externas pesadas (Slim-like architecture).',
            '- Autenticación: JSON Web Tokens (JWT).',
            '- Base de Datos: MySQL / MariaDB.'
        ]
    },
    {
        heading: 'Infraestructura y Despliegue',
        content: [
            '- Hosting: cPanel (Apache/Litespeed).',
            '- Configuración: .htaccess para ruteo de SPA y API.',
            '- Seguridad: Validaciones de sesión en cada endpoint y sanitización de consultas SQL.'
        ]
    }
]);

// 2. Diccionario de Datos
const createTableRows = (headers, data) => {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: headers.map(h => new TableCell({ children: [new Paragraph({ text: h, children: [new TextRun({ bold: true })] })] }))
            }),
            ...data.map(row => new TableRow({
                children: row.map(cell => new TableCell({ children: [new Paragraph(cell)] }))
            }))
        ]
    });
};

createDoc('2_Diccionario_Datos.docx', 'Diccionario de Datos - TimeTracker', [
    {
        heading: 'Tabla: users',
        content: [
            'Almacena los usuarios del sistema y sus perfiles de costo.',
            createTableRows(['Columna', 'Tipo', 'Descripción'], [
                ['id', 'INT', 'PK Autoincrement.'],
                ['name', 'VARCHAR', 'Nombre completo.'],
                ['email', 'VARCHAR', 'Correo electrónico (Login).'],
                ['role', 'ENUM', 'admin, c-level, commercial, staff.'],
                ['hourly_cost', 'DECIMAL', 'Costo interno por hora del usuario.'],
                ['weekly_capacity', 'DECIMAL', 'Horas disponibles por semana (default 40).']
            ])
        ]
    },
    {
        heading: 'Tabla: projects',
        content: [
            'Proyectos asignados a clientes con presupuesto.',
            createTableRows(['Columna', 'Tipo', 'Descripción'], [
                ['id', 'INT', 'PK.'],
                ['client_id', 'INT', 'FK a clients.'],
                ['name', 'VARCHAR', 'Nombre del proyecto.'],
                ['budget_hours', 'DECIMAL', 'Horas presupuestadas.'],
                ['status', 'VARCHAR', 'Activo, Finalizado, etc.']
            ])
        ]
    },
    {
        heading: 'Tabla: time_entries',
        content: [
            'Registros de actividad diaria.',
            createTableRows(['Columna', 'Tipo', 'Descripción'], [
                ['id', 'INT', 'PK.'],
                ['user_id', 'INT', 'FK a users.'],
                ['hours', 'DECIMAL', 'Cantidad de tiempo.'],
                ['status', 'VARCHAR', 'draft, submitted, approved, rejected.']
            ])
        ]
    }
]);

// 3. Guía de Setup
createDoc('3_Guia_Instalacion.docx', 'Guía de Instalación del Entorno', [
    {
        heading: 'Requisitos Previos',
        content: [
            '- Servidor con PHP 7.4+ y MySQL 5.7+.',
            '- Node.js y npm instalado localmente para el build.',
            '- Acceso a cPanel o FTP.'
        ]
    },
    {
        heading: 'Paso 1: Preparación de Base de Datos',
        content: [
            '1. Cree una base de datos MySQL en su panel de control.',
            '2. Importe el esquema inicial o configure las credenciales en api/config.php.',
            '3. Ejecute el script de actualización: /api/update.php?key=LLAVE_MAESTRA.'
        ]
    },
    {
        heading: 'Paso 2: Construcción del Frontend',
        content: [
            '1. Ejecute "npm install" en la raíz del proyecto.',
            '2. Ejecute "npm run build" para generar la carpeta /dist.',
            '3. Los archivos generados en /dist son los que se deben subir al servidor.'
        ]
    },
    {
        heading: 'Paso 3: Despliegue en cPanel',
        content: [
            '1. Suba los archivos de /dist a la carpeta pública (ej. /public_html/TimeTracker/).',
            '2. Suba la carpeta /api a la misma raíz.',
            '3. Verifique que el archivo .htaccess esté presente para manejar el ruteo de React.'
        ]
    }
]);

// 4. Documentación de API
createDoc('4_Documentacion_API.docx', 'Documentación Técnica de la API', [
    {
        heading: 'Endpoints de Autenticación',
        content: [
            'POST /auth/login: Inicia sesión y devuelve un token JWT.',
            'POST /auth/forgot-password: Envía OTP para recuperación.',
            'POST /auth/reset-password: Cambia la contraseña con OTP.'
        ]
    },
    {
        heading: 'Endpoints de Gestión',
        content: [
            'GET /projects: Lista todos los proyectos con métricas de consumo.',
            'GET /clients: Lista clientes y sus balances financieros.',
            'GET /time-entries: Recupera horas registradas según rol (staff ve solo lo suyo).',
            'POST /time-entries: Registra nuevas horas.'
        ]
    },
    {
        heading: 'Endpoints de Reportes e IA',
        content: [
            'GET /dashboard: Estadísticas globales y gráficos de rentabilidad.',
            'GET /predictive-alerts: Consulta al motor Gemini para generar alertas de riesgo.',
            'GET /reports/heatmap: Genera mapa de calor de disponibilidad del equipo.'
        ]
    }
]);

// 5. Casos de Uso
createDoc('5_Casos_de_Uso.docx', 'Casos de Uso del Sistema', [
    {
        heading: 'Caso 1: Registro de Horas Diarias',
        content: [
            'Actores: Staff, Commercial.',
            'Precondición: El usuario está logueado y tiene proyectos activos asignados.',
            'Flujo: El usuario selecciona proyecto, tarea, describe la actividad e ingresa las horas.',
            'Postcondición: Las horas quedan guardadas en estado "Draft" o "Submitted".'
        ]
    },
    {
        heading: 'Caso 2: Aprobación de TimeSheets',
        content: [
            'Actores: Admin, C-Level.',
            'Precondición: Existen registros en estado "Submitted".',
            'Flujo: El supervisor revisa la lista, puede aprobar o rechazar con comentario.',
            'Postcondición: El registro cambia a "Approved" o "Rejected", notificando al usuario.'
        ]
    },
    {
        heading: 'Caso 3: Generación de Reporte Predictivo IA',
        content: [
            'Actores: Admin, C-Level.',
            'Precondición: Hay datos de consumo en por lo menos un proyecto activo.',
            'Flujo: Se accede a la pantalla de Alertas IA, el sistema calcula el burn rate y solicita un insight a Gemini.',
            'Postcondición: Se visualizan alertas críticas y sugerencias de gestión.'
        ]
    }
]);
