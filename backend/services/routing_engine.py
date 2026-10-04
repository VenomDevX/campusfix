"""Category -> department routing. A rules table today; per-campus overrides
(e.g. route Lab Block electrical to a lab technician) slot in here later."""

DEPARTMENTS = ["Plumbing Maintenance", "Electrical Maintenance", "Furniture/Carpentry",
               "Sanitation Team", "Civil Maintenance", "General Admin"]

ROUTES = {
    "Plumbing": "Plumbing Maintenance",
    "Electrical": "Electrical Maintenance",
    "Furniture": "Furniture/Carpentry",
    "Sanitation": "Sanitation Team",
    "Infrastructure": "Civil Maintenance",
    "Other": "General Admin",
}


def route(category: str) -> str:
    return ROUTES.get(category, "General Admin")
