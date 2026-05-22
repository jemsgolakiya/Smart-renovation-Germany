# Generated migration for contractor caching fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractor',
            name='place_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Unique identifier from Google Places API',
                max_length=255,
                null=True,
                unique=True,
                verbose_name='Google Place ID'
            ),
        ),
        migrations.AddField(
            model_name='contractor',
            name='latitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name='Latitude'
            ),
        ),
        migrations.AddField(
            model_name='contractor',
            name='longitude',
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                max_digits=10,
                null=True,
                verbose_name='Longitude'
            ),
        ),
        migrations.AddField(
            model_name='contractor',
            name='last_updated',
            field=models.DateTimeField(
                auto_now=True,
                help_text='Last time this contractor data was updated',
                verbose_name='Last Updated'
            ),
        ),
        migrations.AddField(
            model_name='contractor',
            name='certification_signals',
            field=models.JSONField(
                blank=True,
                help_text='AI-enriched certification data (HWK, Meisterbetrieb, KfW, etc.)',
                null=True,
                verbose_name='Certification Signals'
            ),
        ),
    ]
