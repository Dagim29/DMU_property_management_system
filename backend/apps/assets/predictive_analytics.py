"""
Predictive Maintenance Analytics Module

This module provides AI-powered predictive maintenance capabilities including:
- Asset failure risk prediction
- Maintenance cost forecasting
- Optimal maintenance scheduling recommendations
"""

from datetime import datetime, timedelta
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from .models import Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder


class PredictiveMaintenanceEngine:
    """
    Engine for predictive maintenance analytics and risk assessment
    """
    
    # Risk thresholds
    HIGH_RISK_THRESHOLD = 70
    MEDIUM_RISK_THRESHOLD = 40
    
    # Weight factors for risk calculation
    WEIGHTS = {
        'age': 0.25,
        'maintenance_frequency': 0.30,
        'cost_trend': 0.20,
        'downtime': 0.15,
        'last_maintenance': 0.10
    }
    
    @staticmethod
    def calculate_asset_age_score(asset):
        """
        Calculate risk score based on asset age
        Returns: 0-100 (higher = more risk)
        """
        if not asset.purchase_date:
            return 50  # Default medium risk if no purchase date
        
        age_years = (timezone.now().date() - asset.purchase_date).days / 365.25
        
        # Different asset types have different expected lifespans
        expected_lifespan = {
            'EQP': 7,   # Equipment: 7 years
            'FUR': 10,  # Furniture: 10 years
            'VEH': 8,   # Vehicle: 8 years
            'BLD': 20,  # Building: 20 years
            'OTH': 10   # Other: 10 years
        }
        
        lifespan = expected_lifespan.get(asset.asset_type, 10)
        age_ratio = age_years / lifespan
        
        # Score increases exponentially as asset approaches end of life
        if age_ratio < 0.5:
            return min(age_ratio * 40, 100)  # 0-20 score for first half of life
        elif age_ratio < 0.75:
            return min(20 + (age_ratio - 0.5) * 80, 100)  # 20-40 for next quarter
        else:
            return min(40 + (age_ratio - 0.75) * 160, 100)  # 40-100 for final quarter
    
    @staticmethod
    def calculate_maintenance_frequency_score(asset):
        """
        Calculate risk score based on maintenance frequency
        Returns: 0-100 (higher = more frequent issues)
        """
        # Get maintenance requests in last 12 months
        one_year_ago = timezone.now() - timedelta(days=365)
        recent_requests = MaintenanceRequest.objects.filter(
            asset=asset,
            created_at__gte=one_year_ago
        ).count()
        
        # Score based on frequency (more requests = higher risk)
        if recent_requests == 0:
            return 10  # Low risk if no recent maintenance
        elif recent_requests <= 2:
            return 25
        elif recent_requests <= 4:
            return 50
        elif recent_requests <= 6:
            return 75
        else:
            return 95  # Very high risk if many requests
    
    @staticmethod
    def calculate_cost_trend_score(asset):
        """
        Calculate risk score based on maintenance cost trends
        Returns: 0-100 (higher = increasing costs)
        """
        # Get work orders from last 12 months
        one_year_ago = timezone.now() - timedelta(days=365)
        work_orders = WorkOrder.objects.filter(
            request__asset=asset,
            completed_at__gte=one_year_ago,
            completed_at__isnull=False
        ).order_by('completed_at')
        
        if work_orders.count() < 2:
            return 20  # Not enough data
        
        # Split into first half and second half
        mid_point = work_orders.count() // 2
        first_half = work_orders[:mid_point]
        second_half = work_orders[mid_point:]
        
        first_half_avg = first_half.aggregate(
            avg=Avg(F('cost_labor') + F('cost_materials'))
        )['avg'] or 0
        
        second_half_avg = second_half.aggregate(
            avg=Avg(F('cost_labor') + F('cost_materials'))
        )['avg'] or 0
        
        if first_half_avg == 0:
            return 30
        
        # Calculate percentage increase
        increase_ratio = (second_half_avg - first_half_avg) / first_half_avg
        
        if increase_ratio < 0:
            return 15  # Costs decreasing - good sign
        elif increase_ratio < 0.2:
            return 30  # Slight increase
        elif increase_ratio < 0.5:
            return 60  # Moderate increase
        else:
            return 90  # Significant increase - high risk
    
    @staticmethod
    def calculate_downtime_score(asset):
        """
        Calculate risk score based on asset downtime
        Returns: 0-100 (higher = more downtime)
        """
        # Count days asset was under maintenance in last 6 months
        six_months_ago = timezone.now() - timedelta(days=180)
        
        maintenance_requests = MaintenanceRequest.objects.filter(
            asset=asset,
            created_at__gte=six_months_ago,
            status__in=['IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED']
        )
        
        total_downtime_days = 0
        for request in maintenance_requests:
            if request.status == 'COMPLETED':
                # Calculate time from creation to completion
                work_order = WorkOrder.objects.filter(request=request).first()
                if work_order and work_order.completed_at:
                    downtime = (work_order.completed_at - request.created_at).days
                    total_downtime_days += max(downtime, 0)
        
        # Score based on downtime percentage
        downtime_percentage = (total_downtime_days / 180) * 100
        
        if downtime_percentage < 5:
            return 10
        elif downtime_percentage < 10:
            return 30
        elif downtime_percentage < 20:
            return 60
        else:
            return 90
    
    @staticmethod
    def calculate_last_maintenance_score(asset):
        """
        Calculate risk score based on time since last maintenance
        Returns: 0-100 (higher = longer since last maintenance)
        """
        last_maintenance = MaintenanceRequest.objects.filter(
            asset=asset,
            status='COMPLETED'
        ).order_by('-created_at').first()
        
        if not last_maintenance:
            # No maintenance history - moderate risk
            return 50
        
        days_since = (timezone.now() - last_maintenance.created_at).days
        
        # Score increases with time
        if days_since < 30:
            return 5
        elif days_since < 90:
            return 20
        elif days_since < 180:
            return 40
        elif days_since < 365:
            return 70
        else:
            return 95
    
    @classmethod
    def calculate_risk_score(cls, asset):
        """
        Calculate overall risk score for an asset
        Returns: dict with score and breakdown
        """
        scores = {
            'age': cls.calculate_asset_age_score(asset),
            'maintenance_frequency': cls.calculate_maintenance_frequency_score(asset),
            'cost_trend': cls.calculate_cost_trend_score(asset),
            'downtime': cls.calculate_downtime_score(asset),
            'last_maintenance': cls.calculate_last_maintenance_score(asset)
        }
        
        # Calculate weighted average
        total_score = sum(scores[key] * cls.WEIGHTS[key] for key in scores)
        
        # Determine risk level
        if total_score >= cls.HIGH_RISK_THRESHOLD:
            risk_level = 'HIGH'
            risk_color = 'red'
        elif total_score >= cls.MEDIUM_RISK_THRESHOLD:
            risk_level = 'MEDIUM'
            risk_color = 'yellow'
        else:
            risk_level = 'LOW'
            risk_color = 'green'
        
        return {
            'id': asset.id,  # Add numeric ID for navigation
            'asset_id': asset.asset_id,
            'asset_name': asset.name,
            'total_score': round(total_score, 1),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'breakdown': {k: round(v, 1) for k, v in scores.items()},
            'recommendations': cls.generate_recommendations(asset, total_score, scores)
        }
    
    @classmethod
    def generate_recommendations(cls, asset, total_score, scores):
        """
        Generate actionable recommendations based on risk factors
        """
        recommendations = []
        
        if scores['age'] > 70:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Consider replacement',
                'reason': 'Asset is approaching end of expected lifespan',
                'estimated_cost': 'High'
            })
        
        if scores['maintenance_frequency'] > 60:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Schedule comprehensive inspection',
                'reason': 'Frequent maintenance requests indicate underlying issues',
                'estimated_cost': 'Medium'
            })
        
        if scores['cost_trend'] > 70:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Evaluate repair vs. replace',
                'reason': 'Maintenance costs are increasing significantly',
                'estimated_cost': 'Variable'
            })
        
        if scores['last_maintenance'] > 60:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Schedule preventive maintenance',
                'reason': 'Extended period since last maintenance',
                'estimated_cost': 'Low'
            })
        
        if scores['downtime'] > 70:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Investigate root cause of downtime',
                'reason': 'Excessive downtime affecting operations',
                'estimated_cost': 'Medium'
            })
        
        if not recommendations:
            recommendations.append({
                'priority': 'LOW',
                'action': 'Continue regular maintenance schedule',
                'reason': 'Asset is performing well',
                'estimated_cost': 'Low'
            })
        
        return recommendations
    
    @classmethod
    def get_assets_at_risk(cls, campus=None, risk_level=None, limit=None):
        """
        Get list of assets at risk with their scores
        """
        assets = Asset.objects.filter(status__in=['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE'])
        
        if campus:
            assets = assets.filter(campus_id=campus)
        
        results = []
        for asset in assets:
            risk_data = cls.calculate_risk_score(asset)
            
            if risk_level:
                if risk_data['risk_level'] == risk_level:
                    results.append(risk_data)
            else:
                results.append(risk_data)
        
        # Sort by risk score (highest first)
        results.sort(key=lambda x: x['total_score'], reverse=True)
        
        if limit:
            results = results[:limit]
        
        return results
    
    @classmethod
    def get_predictive_summary(cls):
        """
        Get summary statistics for predictive maintenance
        """
        all_assets = Asset.objects.filter(status__in=['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE'])
        
        high_risk = 0
        medium_risk = 0
        low_risk = 0
        total_estimated_cost = 0
        
        for asset in all_assets:
            risk_data = cls.calculate_risk_score(asset)
            
            if risk_data['risk_level'] == 'HIGH':
                high_risk += 1
                total_estimated_cost += float(asset.current_value or 0) * 0.3  # Estimate 30% of value
            elif risk_data['risk_level'] == 'MEDIUM':
                medium_risk += 1
                total_estimated_cost += float(asset.current_value or 0) * 0.15  # Estimate 15% of value
            else:
                low_risk += 1
        
        return {
            'total_assets': all_assets.count(),
            'high_risk_count': high_risk,
            'medium_risk_count': medium_risk,
            'low_risk_count': low_risk,
            'estimated_maintenance_cost': round(total_estimated_cost, 2),
            'risk_distribution': {
                'high': round((high_risk / all_assets.count() * 100) if all_assets.count() > 0 else 0, 1),
                'medium': round((medium_risk / all_assets.count() * 100) if all_assets.count() > 0 else 0, 1),
                'low': round((low_risk / all_assets.count() * 100) if all_assets.count() > 0 else 0, 1)
            }
        }
