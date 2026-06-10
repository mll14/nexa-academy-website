import logging

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from . import sanity_push, sanity_sync
from .models import Program, ProgramIntake

logger = logging.getLogger(__name__)


def _syncing_from_sanity():
    """True when we are inside a sanity_sync handler (prevents push-back loops)."""
    return getattr(sanity_sync._local, 'active', False)


@receiver(post_save, sender=Program)
def program_saved(sender, instance, **kwargs):
    if _syncing_from_sanity():
        return
    try:
        sanity_push.push_program(instance)
    except Exception as exc:
        logger.error('program_saved signal: %s', exc)


@receiver(post_delete, sender=Program)
def program_deleted(sender, instance, **kwargs):
    if _syncing_from_sanity():
        return
    try:
        sanity_push.delete_program(instance.sanity_id)
    except Exception as exc:
        logger.error('program_deleted signal: %s', exc)


@receiver(post_save, sender=ProgramIntake)
def intake_saved(sender, instance, **kwargs):
    if _syncing_from_sanity():
        return
    try:
        sanity_push.push_intake(instance)
    except Exception as exc:
        logger.error('intake_saved signal: %s', exc)


@receiver(post_delete, sender=ProgramIntake)
def intake_deleted(sender, instance, **kwargs):
    if _syncing_from_sanity():
        return
    try:
        sanity_push.delete_intake(instance.sanity_id)
    except Exception as exc:
        logger.error('intake_deleted signal: %s', exc)
