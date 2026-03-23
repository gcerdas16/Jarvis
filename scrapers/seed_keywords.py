"""Seed the keyword bank with industries and search keywords for Costa Rica."""
import asyncio
import json
from pathlib import Path
from dotenv import load_dotenv
from src.utils.db import get_pool

load_dotenv()

DATA_PATH = Path(__file__).parent / "data" / "industries.json"


def load_industries() -> dict:
    """Load industries and keywords from JSON file."""
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


async def main():
    pool = await get_pool()
    industries = load_industries()

    try:
        total_industries = 0
        total_keywords = 0

        for industry_name, config in industries.items():
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
