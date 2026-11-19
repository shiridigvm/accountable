"""Sample data. Fixed records; every date is an offset from today, so the data stays current.

Run with `npm run seed`. Startup also seeds when the database file is new.
"""

import itertools
from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, insert
from sqlalchemy.engine import Engine

from accountable import store
from accountable.clock import today as clock_today
from accountable.config import database_path
from accountable.db import make_engine
from accountable.rules.stages import DEFAULT_PROBABILITY
from accountable.schema import activities, deal_stage_changes, metadata

ORGANIZATIONS = [
    # name, website, industry, notes
    (
        "Kestrel Freight",
        "kestrelfreight.example",
        "Logistics",
        "Regional freight operator.",
    ),
    (
        "Brightline Dental",
        "brightline.example",
        "Healthcare",
        "Group of dental practices.",
    ),
    ("Northwind Health", "northwind.example", "Healthcare", "Hospital IT services."),
    ("Pinecrest Schools", "pinecrest.example", "Education", "School district."),
    (
        "Atlas Logistics",
        "atlaslogistics.example",
        "Logistics",
        "Fleet and warehouse services.",
    ),
    ("Helix Robotics", "helix.example", "Manufacturing", "Industrial robot builder."),
]

# name, organization, title, status, email, phone
CONTACTS = [
    ("Priya Nair", "Kestrel Freight", "Operations Manager", "customer"),
    ("Marcus Hale", "Kestrel Freight", "Procurement Lead", "qualified"),
    ("Elena Vasquez", "Brightline Dental", "Practice Owner", "lead"),
    ("Tom Okafor", "Brightline Dental", "Office Manager", "lead"),
    ("Sara Lindqvist", "Northwind Health", "IT Director", "qualified"),
    ("David Chen", "Northwind Health", "CFO", "lead"),
    ("Grace Morton", "Pinecrest Schools", "Business Manager", "qualified"),
    ("Ravi Patel", "Pinecrest Schools", "Principal", "customer"),
    ("Lena Fischer", "Atlas Logistics", "VP Operations", "customer"),
    ("Owen Brooks", "Atlas Logistics", "Fleet Manager", "qualified"),
    ("Maya Torres", "Helix Robotics", "Engineering Manager", "qualified"),
    ("Jonas Berg", "Helix Robotics", "Purchasing Director", "lead"),
    ("Hannah Kim", None, "Owner, Kim Florals", "lead"),
    ("Carlos Ruiz", None, "Founder", "lead"),
    ("Amelia Scott", None, "Head of Sales", "customer"),
    ("Ben Carter", None, "Consultant", "qualified"),
    ("Nora Ellis", None, "Director", "customer"),
    ("Victor Ramos", None, "Partner", "customer"),
    ("Ines Duarte", None, "Manager", "lead"),
    ("Felix Wagner", None, "Operations Lead", "customer"),
]

# name, organization, stage, value (dollars), expected close offset, actual close offset, main contact
# Offsets are days from today. Open deals with a negative expected offset are late.
DEALS = [
    (
        "Atlas Logistics fleet rollout",
        "Atlas Logistics",
        "New",
        48000,
        75,
        None,
        "Owen Brooks",
    ),
    (
        "Brightline Dental intro",
        "Brightline Dental",
        "New",
        18500,
        28,
        None,
        "Elena Vasquez",
    ),
    ("Kestrel Freight audit", "Kestrel Freight", "New", 32000, -12, None, "Priya Nair"),
    (
        "Northwind Health pilot",
        "Northwind Health",
        "New",
        41000,
        45,
        None,
        "Sara Lindqvist",
    ),
    (
        "Pinecrest Schools license",
        "Pinecrest Schools",
        "Qualified",
        64000,
        31,
        None,
        "Grace Morton",
    ),
    (
        "Helix Robotics line upgrade",
        "Helix Robotics",
        "Qualified",
        81000,
        60,
        None,
        "Jonas Berg",
    ),
    ("Quarry Hill renovation", None, "Qualified", 39000, -9, None, None),
    ("Oakridge Insurance platform", None, "Qualified", 52000, 100, None, None),
    (
        "Helix Robotics quote",
        "Helix Robotics",
        "Proposal",
        120000,
        18,
        None,
        "Maya Torres",
    ),
    ("Cobalt Retail rollout", None, "Proposal", 110000, 120, None, None),
    ("Bluewater Marine renewal", None, "Proposal", 96000, 66, None, None),
    ("Greenfield Clinics expansion", None, "Proposal", 70000, -4, None, None),
    (
        "Atlas Logistics contract",
        "Atlas Logistics",
        "Negotiation",
        150000,
        23,
        None,
        "Lena Fischer",
    ),
    ("Orchid Bakery chain", None, "Negotiation", 65000, 8, None, "Hannah Kim"),
    ("Vantage Legal retainer", None, "Negotiation", 88000, 80, None, "Amelia Scott"),
    ("Harbor Foods order", None, "Won", 42000, -270, -265, None),
    ("Ironwood Partners pilot", None, "Won", 56000, -230, -224, None),
    ("Crescent Print order", None, "Won", 38000, -190, -186, None),
    ("Maple Hotels install", None, "Won", 120000, -140, -139, "Nora Ellis"),
    ("Evergreen Pharma license", None, "Won", 77000, -110, -103, "Felix Wagner"),
    ("Ferro Metals supply", None, "Won", 150000, -60, -58, "Victor Ramos"),
    ("Redwood Energy upgrade", None, "Won", 95000, -20, -19, None),
    ("Silverline Media subscription", None, "Won", 64000, -14, -14, "Ines Duarte"),
    ("Basil Cafe kiosk", None, "Lost", 12000, -40, -42, None),
    ("Juniper Labs trial", None, "Lost", 45000, -90, -95, None),
]

# type, target ("contact" or "deal"), target name, description, occurred offset,
# follow-up offset (or None), done
ACTIVITIES = [
    (
        "call",
        "contact",
        "Priya Nair",
        "Discussed audit scope and timing",
        -20,
        None,
        False,
    ),
    (
        "email",
        "contact",
        "Priya Nair",
        "Sent the audit proposal summary",
        -18,
        -10,
        False,
    ),
    (
        "note",
        "deal",
        "Kestrel Freight audit",
        "Client wants a fixed-fee option",
        -14,
        None,
        False,
    ),
    (
        "call",
        "contact",
        "Marcus Hale",
        "Introduced to the procurement team",
        -30,
        None,
        False,
    ),
    (
        "email",
        "contact",
        "Elena Vasquez",
        "Sent intro deck and pricing",
        -25,
        None,
        False,
    ),
    (
        "call",
        "contact",
        "Elena Vasquez",
        "Asked about office rollout timing",
        -9,
        -2,
        False,
    ),
    (
        "note",
        "deal",
        "Brightline Dental intro",
        "Owner wants a demo next month",
        -6,
        None,
        False,
    ),
    ("email", "contact", "Tom Okafor", "Shared the IT checklist", -12, None, False),
    ("call", "contact", "Sara Lindqvist", "Security review call", -22, -5, True),
    (
        "note",
        "deal",
        "Northwind Health pilot",
        "Pilot scope agreed in principle",
        -16,
        None,
        False,
    ),
    ("email", "contact", "David Chen", "Sent ROI summary for the CFO", -11, 3, False),
    (
        "call",
        "contact",
        "Grace Morton",
        "Budget review with the business manager",
        -28,
        None,
        False,
    ),
    (
        "note",
        "deal",
        "Pinecrest Schools license",
        "Principal signed off on the trial",
        -19,
        None,
        False,
    ),
    ("email", "contact", "Ravi Patel", "Sent renewal reminder", -8, 4, False),
    ("call", "contact", "Lena Fischer", "Quarterly check-in", -35, None, False),
    (
        "email",
        "deal",
        "Atlas Logistics contract",
        "Redlines returned by legal",
        -4,
        None,
        False,
    ),
    ("call", "deal", "Atlas Logistics contract", "Contract review call", -1, 6, False),
    (
        "note",
        "contact",
        "Owen Brooks",
        "Fleet size confirmed at 42 vans",
        -13,
        None,
        False,
    ),
    (
        "email",
        "deal",
        "Atlas Logistics fleet rollout",
        "Sent rollout timeline",
        -10,
        None,
        False,
    ),
    ("call", "contact", "Maya Torres", "Technical deep dive", -17, -3, False),
    ("note", "deal", "Helix Robotics quote", "Quote valid for 30 days", -7, 2, False),
    (
        "email",
        "contact",
        "Jonas Berg",
        "Introduction from Maya Torres",
        -21,
        None,
        False,
    ),
    (
        "call",
        "contact",
        "Jonas Berg",
        "Discussed the purchasing timeline",
        -3,
        10,
        False,
    ),
    (
        "note",
        "contact",
        "Hannah Kim",
        "Florist chain interested in a pilot",
        -26,
        None,
        False,
    ),
    ("email", "deal", "Orchid Bakery chain", "Pricing sent", -5, None, False),
    (
        "call",
        "deal",
        "Orchid Bakery chain",
        "Negotiation on payment terms",
        -2,
        None,
        False,
    ),
    ("note", "contact", "Amelia Scott", "Renewal went smoothly", -60, None, True),
    (
        "email",
        "deal",
        "Vantage Legal retainer",
        "Sent draft retainer agreement",
        -15,
        None,
        False,
    ),
    ("call", "contact", "Carlos Ruiz", "First discovery call", -40, None, False),
    ("email", "contact", "Ben Carter", "Introduction email", -45, None, False),
    (
        "note",
        "contact",
        "Nora Ellis",
        "Happy with the install, asked about add-ons",
        -50,
        None,
        False,
    ),
    ("call", "contact", "Victor Ramos", "Partner check-in", -33, -8, True),
    ("email", "contact", "Ines Duarte", "Sent a case study", -29, None, False),
    ("note", "contact", "Felix Wagner", "Ops team review of usage", -38, None, False),
    (
        "call",
        "contact",
        "Ben Carter",
        "Follow-up on the services scope",
        -24,
        -6,
        False,
    ),
    ("note", "deal", "Ironwood Partners pilot", "Pilot went well", -225, None, False),
    (
        "email",
        "deal",
        "Redwood Energy upgrade",
        "Thank-you note sent",
        -18,
        None,
        False,
    ),
    (
        "note",
        "deal",
        "Juniper Labs trial",
        "Trial ended without a decision",
        -95,
        None,
        False,
    ),
    (
        "call",
        "contact",
        "Priya Nair",
        "Renewal discussion for next year",
        -2,
        12,
        False,
    ),
    ("email", "contact", "Lena Fischer", "Shared quarterly results", -6, None, False),
]

# Stage path for each deal that has moved, from New to its current stage.
OPEN_PATHS = {
    "Qualified": ["New", "Qualified"],
    "Proposal": ["New", "Qualified", "Proposal"],
    "Negotiation": ["New", "Qualified", "Proposal", "Negotiation"],
}
CLOSED_PATHS = {
    "Won": ["New", "Qualified", "Proposal", "Negotiation", "Won"],
    "Lost": ["New", "Qualified", "Lost"],
}

# Contacts are created in order, so the ids used below are stable.
CONTACT_EMAIL_DOMAIN = "example.com"


def _slug(name: str) -> str:
    return name.lower().replace(" ", ".")


def _at(day: date, index: int) -> datetime:
    """A creation time for ordering: the day, then a small step per record."""
    return datetime.combine(day, time(9, 0)) + timedelta(minutes=index)


def seed_database(engine: Engine, today: date) -> None:
    """Replace every row with the sample data. Table structure is kept."""
    with engine.begin() as conn:
        for table in reversed(metadata.sorted_tables):
            conn.execute(delete(table))

        org_ids = {}
        for name, website, industry, notes in ORGANIZATIONS:
            org_ids[name] = store.insert_organization(
                conn,
                {
                    "name": name,
                    "website": website,
                    "industry": industry,
                    "notes": notes,
                },
            )

        contact_ids = {}
        for name, org, title, status in CONTACTS:
            contact_ids[name] = store.insert_contact(
                conn,
                {
                    "name": name,
                    "email": f"{_slug(name)}@{CONTACT_EMAIL_DOMAIN}",
                    "phone": f"555-010-{len(contact_ids) + 100:04d}",
                    "job_title": title,
                    "status": status,
                    "organization_id": org_ids[org] if org else None,
                },
            )

        position_by_stage: dict[str, int] = {}
        deal_ids = {}
        deal_rows = []
        for name, org, stage, dollars, exp_off, act_off, contact in DEALS:
            position = position_by_stage.get(stage, 0)
            position_by_stage[stage] = position + 1
            actual = today + timedelta(days=act_off) if act_off is not None else None
            deal_id = store.insert_deal(
                conn,
                {
                    "name": name,
                    "stage": stage,
                    "value_cents": dollars * 100,
                    "probability": DEFAULT_PROBABILITY[stage],
                    "expected_close": today + timedelta(days=exp_off),
                    "actual_close": actual,
                    "organization_id": org_ids[org] if org else None,
                    "main_contact_id": contact_ids[contact] if contact else None,
                    "position": position,
                },
            )
            deal_ids[name] = deal_id
            deal_rows.append((deal_id, stage, actual))

        index = 0
        for deal_id, stage, actual in deal_rows:
            path = OPEN_PATHS.get(stage) or CLOSED_PATHS.get(stage) or []
            if not path:
                continue
            anchor = actual if actual else today - timedelta(days=3)
            steps = list(itertools.pairwise(path))
            for k, (from_stage, to_stage) in enumerate(steps):
                changed_on = anchor - timedelta(days=4 * (len(steps) - k))
                conn.execute(
                    insert(deal_stage_changes).values(
                        deal_id=deal_id,
                        from_stage=from_stage,
                        to_stage=to_stage,
                        changed_on=changed_on,
                        created_at=_at(changed_on, index),
                    )
                )
                index += 1

        for (
            kind,
            target,
            target_name,
            description,
            occ_off,
            follow_off,
            done,
        ) in ACTIVITIES:
            occurred = today + timedelta(days=occ_off)
            conn.execute(
                insert(activities).values(
                    type=kind,
                    description=description,
                    occurred_on=occurred,
                    follow_up_on=today + timedelta(days=follow_off)
                    if follow_off is not None
                    else None,
                    done=done,
                    created_at=_at(occurred, index),
                    contact_id=contact_ids[target_name]
                    if target == "contact"
                    else None,
                    deal_id=deal_ids[target_name] if target == "deal" else None,
                )
            )
            index += 1


def main() -> None:
    path = database_path()
    engine = make_engine(path)
    metadata.create_all(engine)
    seed_database(engine, clock_today())
    engine.dispose()
    print(f"Sample data written to {path}")


if __name__ == "__main__":
    main()
