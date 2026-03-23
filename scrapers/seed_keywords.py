"""Seed the keyword bank with industries and search keywords for Costa Rica."""
import asyncio
from dotenv import load_dotenv
from src.utils.db import get_pool

load_dotenv()

INDUSTRIES = {
    "solidaristas": {
        "label": "Asociaciones Solidaristas",
        "keywords": [
            "asociación solidarista contacto email Costa Rica",
            "asociación solidarista costa rica correo",
            "ase solidarista costa rica",
            "solidaristas afiliadas CONASOL",
            "directorio asociaciones solidaristas Costa Rica",
            "federación solidarista costa rica",
            "asociación solidarista empleados contacto",
        ],
    },
    "odontologia": {
        "label": "Odontología y Clínicas Dentales",
        "keywords": [
            "clínicas dentales Costa Rica contacto",
            "odontólogos Costa Rica directorio",
            "dentistas San José Costa Rica",
            "clínica dental Heredia Alajuela correo",
            "implantes dentales Costa Rica clínica",
            "ortodoncia Costa Rica contacto",
            "laboratorio dental Costa Rica",
        ],
    },
    "educacion_preescolar": {
        "label": "Kinders y Educación Preescolar",
        "keywords": [
            "kinder Costa Rica contacto",
            "preescolar San José Costa Rica",
            "guardería infantil Costa Rica directorio",
            "centro educativo preescolar Heredia",
            "jardín de niños Costa Rica correo",
            "maternal Costa Rica contacto email",
            "CDI centro desarrollo infantil Costa Rica",
        ],
    },
    "distribuidoras": {
        "label": "Distribuidoras de Productos",
        "keywords": [
            "distribuidora productos Costa Rica contacto",
            "distribuidora alimentos Costa Rica",
            "distribuidora bebidas Costa Rica correo",
            "distribuidora limpieza Costa Rica",
            "distribuidora mayorista Costa Rica",
            "distribuidora médica Costa Rica",
            "distribuidor industrial Costa Rica contacto",
        ],
    },
    "lavanderias": {
        "label": "Lavanderías e Industria Textil",
        "keywords": [
            "lavandería industrial Costa Rica contacto",
            "lavandería Costa Rica correo",
            "tintorería Costa Rica directorio",
            "servicio lavandería empresas Costa Rica",
            "lavandería hoteles Costa Rica",
        ],
    },
    "medicina": {
        "label": "Médicos y Consultorios",
        "keywords": [
            "consultorio médico Costa Rica contacto",
            "clínica privada Costa Rica directorio",
            "médicos especialistas San José correo",
            "clínica médica Heredia Alajuela",
            "centro médico Costa Rica email",
            "laboratorio clínico Costa Rica contacto",
            "médicos pediatras Costa Rica",
            "dermatólogos Costa Rica contacto",
        ],
    },
    "arquitectura": {
        "label": "Arquitectura e Ingeniería",
        "keywords": [
            "estudio arquitectura Costa Rica contacto",
            "arquitectos Costa Rica directorio",
            "empresa arquitectura San José correo",
            "diseño arquitectónico Costa Rica",
            "ingeniería civil Costa Rica contacto",
            "constructora Costa Rica email",
            "empresa construcción Costa Rica directorio",
        ],
    },
    "tecnologia": {
        "label": "Tecnología y Software",
        "keywords": [
            "empresas tecnología Costa Rica contacto",
            "desarrollo software Costa Rica",
            "empresa TI Costa Rica correo",
            "consultoría tecnológica Costa Rica",
            "startup tecnología San José",
            "empresa ciberseguridad Costa Rica",
            "soporte técnico empresas Costa Rica",
        ],
    },
    "logistica": {
        "label": "Logística y Transporte",
        "keywords": [
            "empresa logística Costa Rica contacto",
            "transporte carga Costa Rica correo",
            "empresa mensajería Costa Rica",
            "operador logístico Costa Rica directorio",
            "almacenaje bodega Costa Rica",
            "agencia aduanal Costa Rica contacto",
            "courier Costa Rica email",
        ],
    },
    "manufactura": {
        "label": "Manufactura e Industria",
        "keywords": [
            "empresa manufactura Costa Rica contacto",
            "fábrica Costa Rica directorio",
            "industria alimentaria Costa Rica correo",
            "planta producción Costa Rica",
            "empresa plásticos Costa Rica",
            "empresa metalmecánica Costa Rica contacto",
            "zona franca empresas Costa Rica",
        ],
    },
    "servicios_financieros": {
        "label": "Servicios Financieros",
        "keywords": [
            "empresa servicios financieros Costa Rica",
            "cooperativa ahorro crédito Costa Rica contacto",
            "asesoría financiera Costa Rica correo",
            "contadores Costa Rica directorio",
            "firma contable Costa Rica",
            "empresa seguros Costa Rica contacto",
            "correduría seguros Costa Rica",
        ],
    },
    "legal": {
        "label": "Servicios Legales",
        "keywords": [
            "bufete abogados Costa Rica contacto",
            "abogados San José Costa Rica correo",
            "notaría Costa Rica directorio",
            "firma legal Costa Rica email",
            "abogado laboral Costa Rica",
            "abogado corporativo Costa Rica contacto",
        ],
    },
    "restaurantes": {
        "label": "Restaurantes y Gastronomía",
        "keywords": [
            "restaurante Costa Rica contacto email",
            "catering empresarial Costa Rica",
            "soda restaurante San José correo",
            "franquicia restaurante Costa Rica",
            "pastelería repostería Costa Rica contacto",
            "cafetería Costa Rica directorio",
        ],
    },
    "hoteleria": {
        "label": "Hotelería y Turismo",
        "keywords": [
            "hotel Costa Rica contacto correo",
            "hostel Costa Rica directorio",
            "agencia viajes Costa Rica email",
            "tour operador Costa Rica contacto",
            "hotel boutique Costa Rica",
            "alquiler vacacional Costa Rica correo",
            "resort Costa Rica contacto",
        ],
    },
    "bienes_raices": {
        "label": "Bienes Raíces",
        "keywords": [
            "inmobiliaria Costa Rica contacto",
            "agencia bienes raíces San José correo",
            "desarrollador inmobiliario Costa Rica",
            "administración condominios Costa Rica",
            "corredor bienes raíces Costa Rica email",
            "empresa propiedades Costa Rica directorio",
        ],
    },
    "veterinaria": {
        "label": "Veterinarias y Mascotas",
        "keywords": [
            "clínica veterinaria Costa Rica contacto",
            "veterinario San José Heredia correo",
            "hospital veterinario Costa Rica",
            "tienda mascotas Costa Rica email",
            "pet shop Costa Rica directorio",
        ],
    },
    "belleza": {
        "label": "Belleza y Estética",
        "keywords": [
            "salón belleza Costa Rica contacto",
            "spa Costa Rica correo directorio",
            "barbería Costa Rica email",
            "clínica estética Costa Rica contacto",
            "centro estético San José Heredia",
            "peluquería Costa Rica directorio",
        ],
    },
    "automotriz": {
        "label": "Automotriz",
        "keywords": [
            "taller mecánico Costa Rica contacto",
            "agencia autos Costa Rica correo",
            "venta repuestos Costa Rica email",
            "taller enderezado pintura Costa Rica",
            "concesionario autos Costa Rica directorio",
            "lubricentro Costa Rica contacto",
        ],
    },
    "educacion": {
        "label": "Educación (Colegios, Academias)",
        "keywords": [
            "colegio privado Costa Rica contacto",
            "academia idiomas Costa Rica correo",
            "instituto técnico Costa Rica email",
            "escuela privada San José directorio",
            "centro capacitación Costa Rica",
            "universidad privada Costa Rica contacto",
        ],
    },
    "salud_fitness": {
        "label": "Salud y Fitness",
        "keywords": [
            "gimnasio Costa Rica contacto email",
            "centro fitness Costa Rica correo",
            "fisioterapia Costa Rica directorio",
            "yoga pilates Costa Rica contacto",
            "nutricionista Costa Rica correo",
            "clínica rehabilitación Costa Rica",
        ],
    },
    "agroindustria": {
        "label": "Agroindustria",
        "keywords": [
            "empresa agrícola Costa Rica contacto",
            "finca cafetalera Costa Rica correo",
            "exportador agrícola Costa Rica",
            "empresa piña banano Costa Rica email",
            "vivero plantas Costa Rica directorio",
            "agroindustria Costa Rica contacto",
        ],
    },
    "publicidad_marketing": {
        "label": "Publicidad y Marketing",
        "keywords": [
            "agencia publicidad Costa Rica contacto",
            "agencia marketing digital Costa Rica",
            "diseño gráfico Costa Rica correo",
            "empresa branding Costa Rica email",
            "producción audiovisual Costa Rica",
            "community manager Costa Rica directorio",
        ],
    },
    "seguridad": {
        "label": "Seguridad Privada",
        "keywords": [
            "empresa seguridad privada Costa Rica contacto",
            "cámaras seguridad Costa Rica correo",
            "vigilancia empresas Costa Rica",
            "alarmas Costa Rica directorio email",
            "seguridad electrónica Costa Rica",
        ],
    },
    "limpieza": {
        "label": "Servicios de Limpieza",
        "keywords": [
            "empresa limpieza Costa Rica contacto",
            "servicio limpieza oficinas Costa Rica",
            "fumigación Costa Rica correo email",
            "control plagas Costa Rica directorio",
            "limpieza industrial Costa Rica",
        ],
    },
    "imprenta": {
        "label": "Imprentas y Artes Gráficas",
        "keywords": [
            "imprenta Costa Rica contacto correo",
            "litografía Costa Rica email",
            "rotulación Costa Rica directorio",
            "empresa impresión Costa Rica",
            "serigrafía bordado Costa Rica contacto",
        ],
    },
    "ferreteria": {
        "label": "Ferreterías y Materiales",
        "keywords": [
            "ferretería Costa Rica contacto email",
            "materiales construcción Costa Rica",
            "ferretería industrial Costa Rica correo",
            "venta materiales Costa Rica directorio",
            "pinturería Costa Rica contacto",
        ],
    },
    "farmacia": {
        "label": "Farmacias y Salud",
        "keywords": [
            "farmacia Costa Rica contacto correo",
            "droguería Costa Rica directorio",
            "distribuidora farmacéutica Costa Rica",
            "equipo médico Costa Rica email",
            "dispositivos médicos Costa Rica contacto",
        ],
    },
    "contabilidad": {
        "label": "Contabilidad y Auditoría",
        "keywords": [
            "firma auditoría Costa Rica contacto",
            "outsourcing contable Costa Rica correo",
            "servicios contables Costa Rica directorio",
            "asesoría tributaria Costa Rica email",
            "contador público Costa Rica",
        ],
    },
    "recursos_humanos": {
        "label": "Recursos Humanos",
        "keywords": [
            "agencia reclutamiento Costa Rica contacto",
            "empresa recursos humanos Costa Rica",
            "outsourcing RRHH Costa Rica correo",
            "headhunter Costa Rica email",
            "empresa temporal Costa Rica directorio",
            "planilla outsourcing Costa Rica",
        ],
    },
    "eventos": {
        "label": "Eventos y Producción",
        "keywords": [
            "empresa eventos Costa Rica contacto",
            "alquiler mobiliario eventos Costa Rica",
            "producción eventos corporativos Costa Rica",
            "catering eventos Costa Rica correo",
            "sonido iluminación eventos Costa Rica",
        ],
    },
}


async def main():
    pool = await get_pool()

    try:
        total_industries = 0
        total_keywords = 0

        for industry_name, config in INDUSTRIES.items():
            # Insert or get industry
            row = await pool.fetchrow(
                "SELECT id FROM industry_categories WHERE name = $1",
                industry_name,
            )
            if row:
                industry_id = row["id"]
            else:
                row = await pool.fetchrow(
                    """INSERT INTO industry_categories (id, name, label, is_active, created_at)
                    VALUES (gen_random_uuid()::text, $1, $2, true, NOW())
                    RETURNING id""",
                    industry_name, config["label"],
                )
                industry_id = row["id"]
                total_industries += 1

            # Insert keywords
            for keyword in config["keywords"]:
                existing = await pool.fetchrow(
                    "SELECT id FROM search_keywords WHERE keyword = $1",
                    keyword,
                )
                if not existing:
                    await pool.execute(
                        """INSERT INTO search_keywords
                        (id, keyword, industry_id, current_page, max_page, is_active, created_at)
                        VALUES (gen_random_uuid()::text, $1, $2, 1, 5, true, NOW())""",
                        keyword, industry_id,
                    )
                    total_keywords += 1

        print(f"Seeded {total_industries} industries, {total_keywords} keywords")

        # Show summary
        rows = await pool.fetch(
            """SELECT ic.label, COUNT(sk.id) as count
            FROM industry_categories ic
            JOIN search_keywords sk ON sk.industry_id = ic.id
            GROUP BY ic.label ORDER BY ic.label"""
        )
        print(f"\n{'Industry':<40} {'Keywords':>8}")
        print("-" * 50)
        for row in rows:
            print(f"{row['label']:<40} {row['count']:>8}")
        print("-" * 50)
        total = sum(row["count"] for row in rows)
        print(f"{'TOTAL':<40} {total:>8}")

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
