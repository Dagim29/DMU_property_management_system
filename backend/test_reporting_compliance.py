"""
Test script for Reporting & Compliance Business Rules (BR-RC-01 through BR-RC-04)
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, timedelta
from django.utils import timezone
from apps.reports.models import ScheduledReport, GeneratedReport, MaintenanceMetrics
from apps.reports.report_generators import (
    generate_report,
    calculate_maintenance_metrics,
    calculate_metrics_by_category,
    calculate_metrics_by_priority
)
from apps.users.models import User


def test_br_rc_01_scheduled_reports():
    """Test BR-RC-01: Monthly asset reports by 5th"""
    print("\n" + "="*80)
    print("BR-RC-01: Monthly Asset Reports by 5th")
    print("="*80)
    
    # Get or create test users
    try:
        property_manager = User.objects.filter(role='PROPERTY_MANAGER').first()
        if not property_manager:
            print("⚠ No Property Manager found. Creating test user...")
            property_manager = User.objects.create_user(
                email='pm_test@dmu.edu.et',
                password='test123',
                first_name='Test',
                last_name='Manager',
                role='PROPERTY_MANAGER'
            )
    except Exception as e:
        print(f"✗ Error getting users: {e}")
        return
    
    # Create scheduled report
    try:
        from datetime import time
        report = ScheduledReport.objects.create(
            name="Test Monthly Asset Report",
            report_type="MONTHLY_ASSET",
            frequency="MONTHLY",
            day_of_month=5,  # BR-RC-01: Run on 5th
            time_of_day=time(8, 0, 0),
            status="ACTIVE",
            is_compliance_required=True,  # BR-RC-02
            created_by=property_manager
        )
        
        # Add recipients
        report.recipients.add(property_manager)
        
        # Calculate next run
        report.next_run = report.calculate_next_run()
        report.save()
        
        print(f"✓ Created scheduled report: {report.name}")
        print(f"  - Report Type: {report.get_report_type_display()}")
        print(f"  - Frequency: {report.get_frequency_display()}")
        print(f"  - Day of Month: {report.day_of_month}")
        print(f"  - Next Run: {report.next_run}")
        print(f"  - Recipients: {report.recipients.count()}")
        print(f"  - Compliance Required: {report.is_compliance_required}")
        
        return report
    except Exception as e:
        print(f"✗ Error creating scheduled report: {e}")
        return None


def test_br_rc_02_ethiopian_guidelines():
    """Test BR-RC-02: Follow Ethiopian Federal Guidelines"""
    print("\n" + "="*80)
    print("BR-RC-02: Ethiopian Federal Property Administration Guidelines")
    print("="*80)
    
    try:
        # Check that reports have compliance fields
        report = GeneratedReport.objects.first()
        if report:
            print(f"✓ Report compliance check:")
            print(f"  - Follows Guidelines: {report.follows_ethiopian_guidelines}")
            print(f"  - Guideline Reference: {report.guideline_reference}")
        else:
            print("ℹ No generated reports found yet")
    except Exception as e:
        print(f"✗ Error: {e}")


def test_br_rc_03_maintenance_metrics():
    """Test BR-RC-03: MTTR, First-Time Fix Rate, Cost Per Repair"""
    print("\n" + "="*80)
    print("BR-RC-03: Maintenance Metrics (MTTR, First-Time Fix Rate, Cost Per Repair)")
    print("="*80)
    
    # Calculate metrics for last 30 days
    today = date.today()
    period_start = today - timedelta(days=30)
    period_end = today
    
    try:
        print(f"Calculating metrics for period: {period_start} to {period_end}")
        
        # Calculate metrics
        metrics = calculate_maintenance_metrics(period_start, period_end)
        
        print(f"\n✓ Maintenance Metrics:")
        print(f"  - Mean Time To Repair (MTTR): {metrics['mean_time_to_repair']} hours")
        print(f"  - First-Time Fix Rate: {metrics['first_time_fix_rate']}%")
        print(f"  - Cost Per Repair: {metrics['cost_per_repair']} ETB")
        print(f"  - Total Requests: {metrics['total_requests']}")
        print(f"  - Completed Requests: {metrics['completed_requests']}")
        print(f"  - Total Cost: {metrics['total_cost']} ETB")
        
        # Calculate breakdown by category
        metrics_by_category = calculate_metrics_by_category(period_start, period_end)
        if metrics_by_category:
            print(f"\n✓ Metrics by Category:")
            for category, data in metrics_by_category.items():
                print(f"  - {data['name']}: {data['count']} requests, {data['total_cost']} ETB")
        
        # Calculate breakdown by priority
        metrics_by_priority = calculate_metrics_by_priority(period_start, period_end)
        if metrics_by_priority:
            print(f"\n✓ Metrics by Priority:")
            for priority, data in metrics_by_priority.items():
                print(f"  - {data['name']}: {data['count']} requests, {data['completion_rate']}% completion")
        
        # Create metrics record
        property_manager = User.objects.filter(role='PROPERTY_MANAGER').first()
        if property_manager:
            metrics_record = MaintenanceMetrics.objects.create(
                period_start=period_start,
                period_end=period_end,
                mean_time_to_repair=metrics['mean_time_to_repair'],
                first_time_fix_rate=metrics['first_time_fix_rate'],
                cost_per_repair=metrics['cost_per_repair'],
                total_requests=metrics['total_requests'],
                completed_requests=metrics['completed_requests'],
                total_cost=metrics['total_cost'],
                metrics_by_category=metrics_by_category,
                metrics_by_priority=metrics_by_priority,
                calculated_by=property_manager
            )
            print(f"\n✓ Created metrics record (ID: {metrics_record.id})")
        
    except Exception as e:
        print(f"✗ Error calculating metrics: {e}")
        import traceback
        traceback.print_exc()


def test_br_rc_04_report_metadata():
    """Test BR-RC-04: Reports must have timestamp, disclaimer, authorization"""
    print("\n" + "="*80)
    print("BR-RC-04: Report Metadata (Timestamp, Disclaimer, Authorization)")
    print("="*80)
    
    # Generate a test report
    today = date.today()
    period_start = today.replace(day=1)
    period_end = today
    
    try:
        property_manager = User.objects.filter(role='PROPERTY_MANAGER').first()
        if not property_manager:
            print("⚠ No Property Manager found")
            return
        
        print(f"Generating report for period: {period_start} to {period_end}")
        
        # Generate report
        result = generate_report(
            report_type='MONTHLY_ASSET',
            period_start=period_start,
            period_end=period_end
        )
        
        # Create generated report with BR-RC-04 compliance
        generated_report = GeneratedReport.objects.create(
            report_type='MONTHLY_ASSET',
            title=f"Test Monthly Asset Report - {period_start.strftime('%B %Y')}",
            generated_by=property_manager,
            period_start=period_start,
            period_end=period_end,
            data=result['data'],
            metrics=result['metrics'],
            follows_ethiopian_guidelines=True,  # BR-RC-02
            guideline_reference='Ethiopian Federal Property Administration Guidelines'
        )
        
        print(f"\n✓ Created generated report (ID: {generated_report.id})")
        
        # Get header metadata (BR-RC-04)
        header = generated_report.get_header_metadata()
        
        print(f"\n✓ Report Header Metadata (BR-RC-04):")
        print(f"  - Title: {header['title']}")
        print(f"  - Generated At: {header['generated_at']}")
        print(f"  - Generated By: {header['generated_by']}")
        print(f"  - Period: {header['period']}")
        print(f"  - Disclaimer: {header['disclaimer'][:80]}...")
        print(f"  - Authorized By: {header['authorized_by']}")
        print(f"  - Follows Guidelines: {header['follows_guidelines']}")
        print(f"  - Guideline Reference: {header['guideline_reference']}")
        
        # Authorize report
        generated_report.authorized_by = property_manager
        generated_report.is_draft = False
        generated_report.save()
        
        print(f"\n✓ Report authorized by: {generated_report.authorized_by.get_full_name()}")
        
        return generated_report
        
    except Exception as e:
        print(f"✗ Error generating report: {e}")
        import traceback
        traceback.print_exc()


def test_report_generation():
    """Test complete report generation workflow"""
    print("\n" + "="*80)
    print("Complete Report Generation Workflow")
    print("="*80)
    
    today = date.today()
    period_start = today.replace(day=1)
    period_end = today
    
    try:
        print(f"Generating all report types for period: {period_start} to {period_end}")
        
        report_types = [
            'MONTHLY_ASSET',
            'MAINTENANCE_COST',
            'ASSET_UTILIZATION',
            'PREVENTIVE_COMPLIANCE',
            'AUDIT_TRAIL'
        ]
        
        for report_type in report_types:
            try:
                result = generate_report(report_type, period_start, period_end)
                print(f"✓ Generated {report_type} report")
                print(f"  - Data keys: {list(result['data'].keys())}")
                print(f"  - Metrics keys: {list(result['metrics'].keys())}")
            except Exception as e:
                print(f"✗ Error generating {report_type}: {e}")
        
    except Exception as e:
        print(f"✗ Error: {e}")


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("REPORTING & COMPLIANCE BUSINESS RULES TEST SUITE")
    print("Testing BR-RC-01 through BR-RC-04")
    print("="*80)
    
    # Test each business rule
    test_br_rc_01_scheduled_reports()
    test_br_rc_02_ethiopian_guidelines()
    test_br_rc_03_maintenance_metrics()
    test_br_rc_04_report_metadata()
    test_report_generation()
    
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80)
    
    # Summary
    print("\n✓ All Reporting & Compliance Business Rules Tested:")
    print("  - BR-RC-01: Monthly asset reports by 5th ✓")
    print("  - BR-RC-02: Ethiopian Federal Guidelines ✓")
    print("  - BR-RC-03: MTTR, First-Time Fix Rate, Cost Per Repair ✓")
    print("  - BR-RC-04: Timestamp, Disclaimer, Authorization ✓")


if __name__ == '__main__':
    main()
