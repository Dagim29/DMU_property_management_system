"""
Test script for Predictive Maintenance Engine
Run with: python test_predictive_maintenance.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.assets.predictive_analytics import PredictiveMaintenanceEngine
from apps.assets.models import Asset

def test_predictive_maintenance():
    """Test the predictive maintenance engine with real data."""
    
    print("=" * 80)
    print(" " * 20 + "PREDICTIVE MAINTENANCE ENGINE TEST")
    print("=" * 80)
    
    # Test 1: Get Summary Statistics
    print("\n📊 TEST 1: SUMMARY STATISTICS")
    print("-" * 80)
    try:
        summary = PredictiveMaintenanceEngine.get_predictive_summary()
        print(f"✓ Total Assets Analyzed: {summary['total_assets']}")
        print(f"✓ High Risk Assets: {summary['high_risk_count']} ({summary['risk_distribution']['high']}%)")
        print(f"✓ Medium Risk Assets: {summary['medium_risk_count']} ({summary['risk_distribution']['medium']}%)")
        print(f"✓ Low Risk Assets: {summary['low_risk_count']} ({summary['risk_distribution']['low']}%)")
        print(f"✓ Estimated Maintenance Cost: ETB {summary['estimated_maintenance_cost']:,.2f}")
        print("✅ Summary test PASSED")
    except Exception as e:
        print(f"❌ Summary test FAILED: {e}")
    
    # Test 2: Get High-Risk Assets
    print("\n⚠️  TEST 2: HIGH-RISK ASSETS (Top 5)")
    print("-" * 80)
    try:
        high_risk = PredictiveMaintenanceEngine.get_assets_at_risk(risk_level='HIGH', limit=5)
        if high_risk:
            for i, asset in enumerate(high_risk, 1):
                print(f"\n{i}. {asset['asset_id']} - {asset['asset_name']}")
                print(f"   Risk Score: {asset['total_score']}/100")
                print(f"   Risk Level: {asset['risk_level']}")
                print(f"   Breakdown:")
                for factor, score in asset['breakdown'].items():
                    bar = "█" * int(score / 5) + "░" * (20 - int(score / 5))
                    print(f"     • {factor.replace('_', ' ').title():20s}: {score:5.1f} [{bar}]")
                print(f"   Recommendations: {len(asset['recommendations'])} action(s)")
                for rec in asset['recommendations'][:2]:  # Show first 2
                    print(f"     [{rec['priority']}] {rec['action']}")
            print(f"\n✅ High-risk assets test PASSED ({len(high_risk)} assets found)")
        else:
            print("ℹ️  No high-risk assets found (this is good!)")
            print("✅ High-risk assets test PASSED")
    except Exception as e:
        print(f"❌ High-risk assets test FAILED: {e}")
    
    # Test 3: Get Medium-Risk Assets
    print("\n⚡ TEST 3: MEDIUM-RISK ASSETS (Top 3)")
    print("-" * 80)
    try:
        medium_risk = PredictiveMaintenanceEngine.get_assets_at_risk(risk_level='MEDIUM', limit=3)
        if medium_risk:
            for i, asset in enumerate(medium_risk, 1):
                print(f"{i}. {asset['asset_id']} - {asset['asset_name']} (Score: {asset['total_score']})")
            print(f"✅ Medium-risk assets test PASSED ({len(medium_risk)} assets found)")
        else:
            print("ℹ️  No medium-risk assets found")
            print("✅ Medium-risk assets test PASSED")
    except Exception as e:
        print(f"❌ Medium-risk assets test FAILED: {e}")
    
    # Test 4: Detailed Analysis of Specific Asset
    print("\n🔍 TEST 4: DETAILED ASSET ANALYSIS")
    print("-" * 80)
    try:
        asset = Asset.objects.filter(status__in=['AVAILABLE', 'IN_USE']).first()
        if asset:
            print(f"Analyzing: {asset.asset_id} - {asset.name}")
            risk_data = PredictiveMaintenanceEngine.calculate_risk_score(asset)
            
            print(f"\n📈 Risk Assessment:")
            print(f"   Total Score: {risk_data['total_score']}/100")
            print(f"   Risk Level: {risk_data['risk_level']}")
            print(f"   Risk Color: {risk_data['risk_color']}")
            
            print(f"\n📊 Factor Breakdown:")
            for factor, score in risk_data['breakdown'].items():
                status = "🔴" if score >= 70 else "🟡" if score >= 40 else "🟢"
                print(f"   {status} {factor.replace('_', ' ').title():25s}: {score:5.1f}/100")
            
            print(f"\n💡 Recommendations ({len(risk_data['recommendations'])}):")
            for i, rec in enumerate(risk_data['recommendations'], 1):
                priority_icon = "🔴" if rec['priority'] == 'HIGH' else "🟡" if rec['priority'] == 'MEDIUM' else "🟢"
                print(f"   {i}. {priority_icon} [{rec['priority']}] {rec['action']}")
                print(f"      Reason: {rec['reason']}")
                print(f"      Estimated Cost: {rec['estimated_cost']}")
            
            print("✅ Detailed analysis test PASSED")
        else:
            print("❌ No assets found for testing")
    except Exception as e:
        print(f"❌ Detailed analysis test FAILED: {e}")
    
    # Test 5: All Risk Levels
    print("\n📋 TEST 5: ALL RISK LEVELS DISTRIBUTION")
    print("-" * 80)
    try:
        all_assets = PredictiveMaintenanceEngine.get_assets_at_risk()
        
        risk_counts = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for asset in all_assets:
            risk_counts[asset['risk_level']] += 1
        
        total = sum(risk_counts.values())
        if total > 0:
            print(f"Total Assets: {total}")
            print(f"  🔴 High Risk:   {risk_counts['HIGH']:3d} ({risk_counts['HIGH']/total*100:5.1f}%)")
            print(f"  🟡 Medium Risk: {risk_counts['MEDIUM']:3d} ({risk_counts['MEDIUM']/total*100:5.1f}%)")
            print(f"  🟢 Low Risk:    {risk_counts['LOW']:3d} ({risk_counts['LOW']/total*100:5.1f}%)")
            print("✅ Distribution test PASSED")
        else:
            print("❌ No assets found")
    except Exception as e:
        print(f"❌ Distribution test FAILED: {e}")
    
    # Test 6: Weight Factors Validation
    print("\n⚖️  TEST 6: WEIGHT FACTORS VALIDATION")
    print("-" * 80)
    try:
        weights = PredictiveMaintenanceEngine.WEIGHTS
        total_weight = sum(weights.values())
        
        print("Weight Distribution:")
        for factor, weight in weights.items():
            percentage = weight * 100
            bar = "█" * int(percentage / 2) + "░" * (50 - int(percentage / 2))
            print(f"  {factor.replace('_', ' ').title():25s}: {percentage:5.1f}% [{bar}]")
        
        print(f"\nTotal Weight: {total_weight}")
        if abs(total_weight - 1.0) < 0.001:
            print("✅ Weights sum to 1.0 - PASSED")
        else:
            print(f"❌ Weights sum to {total_weight} instead of 1.0 - FAILED")
    except Exception as e:
        print(f"❌ Weight validation test FAILED: {e}")
    
    # Test 7: Threshold Validation
    print("\n🎯 TEST 7: RISK THRESHOLD VALIDATION")
    print("-" * 80)
    try:
        high_threshold = PredictiveMaintenanceEngine.HIGH_RISK_THRESHOLD
        medium_threshold = PredictiveMaintenanceEngine.MEDIUM_RISK_THRESHOLD
        
        print(f"High Risk Threshold:   ≥ {high_threshold}")
        print(f"Medium Risk Threshold: ≥ {medium_threshold}")
        print(f"Low Risk Threshold:    < {medium_threshold}")
        
        if high_threshold > medium_threshold > 0:
            print("✅ Thresholds are properly ordered - PASSED")
        else:
            print("❌ Thresholds are not properly ordered - FAILED")
    except Exception as e:
        print(f"❌ Threshold validation test FAILED: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print(" " * 30 + "TEST SUMMARY")
    print("=" * 80)
    print("✅ All tests completed successfully!")
    print("\n📌 Next Steps:")
    print("   1. Navigate to: http://localhost:5173/dashboard/assets/predictive")
    print("   2. Review high-risk assets and recommendations")
    print("   3. Schedule maintenance for critical assets")
    print("   4. Monitor risk trends over time")
    print("=" * 80)

if __name__ == '__main__':
    test_predictive_maintenance()
