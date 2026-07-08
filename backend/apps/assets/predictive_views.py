"""
API Views for Predictive Maintenance
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .predictive_analytics import PredictiveMaintenanceEngine
from .models import Asset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predictive_summary(request):
    """
    Get predictive maintenance summary statistics
    """
    try:
        summary = PredictiveMaintenanceEngine.get_predictive_summary()
        return Response(summary, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def assets_at_risk(request):
    """
    Get list of assets at risk
    Query params:
    - campus: Filter by campus ID
    - risk_level: Filter by risk level (HIGH, MEDIUM, LOW)
    - limit: Limit number of results
    """
    try:
        campus = request.query_params.get('campus')
        risk_level = request.query_params.get('risk_level')
        limit = request.query_params.get('limit')
        
        if limit:
            try:
                limit = int(limit)
            except ValueError:
                limit = None
        
        assets = PredictiveMaintenanceEngine.get_assets_at_risk(
            campus=campus,
            risk_level=risk_level,
            limit=limit
        )
        
        return Response(assets, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_risk_detail(request, asset_id):
    """
    Get detailed risk analysis for a specific asset
    """
    try:
        asset = Asset.objects.get(asset_id=asset_id)
        risk_data = PredictiveMaintenanceEngine.calculate_risk_score(asset)
        
        # Add additional asset details
        risk_data['asset_details'] = {
            'id': asset.id,
            'asset_id': asset.asset_id,
            'name': asset.name,
            'type': asset.asset_type,
            'status': asset.status,
            'campus': asset.campus.name if asset.campus else None,
            'purchase_date': asset.purchase_date,
            'current_value': str(asset.current_value) if asset.current_value else None
        }
        
        return Response(risk_data, status=status.HTTP_200_OK)
    except Asset.DoesNotExist:
        return Response(
            {'error': 'Asset not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def risk_trends(request):
    """
    Get risk trends over time (simulated for now)
    """
    try:
        # This would ideally track historical risk scores
        # For now, return current snapshot
        summary = PredictiveMaintenanceEngine.get_predictive_summary()
        
        # Simulate trend data (in production, this would come from historical data)
        trends = {
            'current': summary,
            'trend_direction': 'stable',  # Could be 'improving', 'stable', 'declining'
            'monthly_comparison': {
                'high_risk_change': 0,  # Change from last month
                'medium_risk_change': 0,
                'low_risk_change': 0
            }
        }
        
        return Response(trends, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
