"""Request bodies. Validation lives here, so bad input gets a 422 before any write."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Stage = Literal["New", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]
ContactStatus = Literal["lead", "qualified", "customer"]
ActivityType = Literal["note", "call", "email"]

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _non_blank(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


class OrganizationIn(BaseModel):
    name: str = Field(max_length=200)
    website: str | None = Field(default=None, max_length=300)
    industry: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)

    check_name = field_validator("name")(_non_blank)


class OrganizationPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=300)
    industry: str | None = Field(default=None, max_length=100)
    notes: str | None = Field(default=None, max_length=5000)

    check_name = field_validator("name")(_non_blank)


class ContactIn(BaseModel):
    name: str = Field(max_length=200)
    email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=200)
    status: ContactStatus = "lead"
    organization_id: int | None = None

    check_name = field_validator("name")(_non_blank)

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        if not EMAIL_PATTERN.match(value.strip()):
            raise ValueError("must be an email address")
        return value.strip()


class ContactPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    job_title: str | None = Field(default=None, max_length=200)
    status: ContactStatus | None = None
    organization_id: int | None = None

    check_name = field_validator("name")(_non_blank)

    @field_validator("email")
    @classmethod
    def check_email(cls, value: str | None) -> str | None:
        if value is None or value.strip() == "":
            return None
        if not EMAIL_PATTERN.match(value.strip()):
            raise ValueError("must be an email address")
        return value.strip()


class DealIn(BaseModel):
    name: str = Field(max_length=200)
    stage: Stage = "New"
    value_cents: int = Field(ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close: date
    actual_close: date | None = None
    organization_id: int | None = None
    main_contact_id: int | None = None

    check_name = field_validator("name")(_non_blank)


class DealPatch(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    stage: Stage | None = None
    value_cents: int | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close: date | None = None
    actual_close: date | None = None
    organization_id: int | None = None
    main_contact_id: int | None = None

    check_name = field_validator("name")(_non_blank)


class MoveIn(BaseModel):
    stage: Stage
    position: int = Field(ge=0)


class ActivityIn(BaseModel):
    type: ActivityType
    description: str = Field(max_length=5000)
    occurred_on: date | None = None
    follow_up_on: date | None = None
    done: bool = False
    contact_id: int | None = None
    deal_id: int | None = None

    check_description = field_validator("description")(_non_blank)

    @model_validator(mode="after")
    def check_one_link(self):
        if (self.contact_id is None) == (self.deal_id is None):
            raise ValueError("an activity must link to exactly one contact or one deal")
        return self


class ActivityPatch(BaseModel):
    type: ActivityType | None = None
    description: str | None = Field(default=None, max_length=5000)
    occurred_on: date | None = None
    follow_up_on: date | None = None
    done: bool | None = None

    check_description = field_validator("description")(_non_blank)
