"""
Offer Serializers - Serialize offer and analysis data
"""
from rest_framework import serializers
from core.models import ContractorOffer, OfferAnalysis


class OfferSerializer(serializers.ModelSerializer):
    """Serializer for ContractorOffer model"""
    
    contractor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ContractorOffer
        fields = [
            'id',
            'contractor_id',
            'contractor_name',
            'gmail_message_id',
            'total_price',
            'currency',
            'timeline_start',
            'timeline_end',
            'timeline_duration_days',
            'scope_of_work',
            'materials_included',
            'labor_breakdown',
            'payment_terms',
            'payment_schedule',
            'warranty_period',
            'warranty_details',
            'insurance_details',
            'special_conditions',
            'offer_date',
            'valid_until',
            'extracted_data',
            'pdf_attachment_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_contractor_name(self, obj):
        """Get contractor name"""
        try:
            from core.models import Contractor
            contractor = Contractor.objects.get(id=obj.contractor_id)
            return contractor.name
        except:
            return f"Contractor {obj.contractor_id}"


class OfferAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for OfferAnalysis model"""
    
    offer_details = OfferSerializer(source='offer', read_only=True)
    compared_offers_details = serializers.SerializerMethodField()
    
    class Meta:
        model = OfferAnalysis
        fields = [
            'id',
            'offer',
            'offer_details',
            'analysis_type',
            'analysis_report',
            'analysis_data',
            'compared_offer_ids',
            'compared_offers_details',
            'documents_used',
            'embeddings_version',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_compared_offers_details(self, obj):
        """Get details of compared offers"""
        if obj.analysis_type == 'comparison' and obj.compared_offer_ids:
            compared_offers = ContractorOffer.objects.filter(id__in=obj.compared_offer_ids)
            return OfferSerializer(compared_offers, many=True).data
        return []
