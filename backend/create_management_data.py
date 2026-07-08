import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from datetime import date, timedelta
from apps.assets.models import Asset, Campus, AssetWarranty, AssetInsurance, AssetCheckout, Budget, BudgetTransaction, AssetDocument
from apps.users.models import User

print("Creating sample data for Asset Management features...")

# Get users
manager = User.objects.filter(role='PROPERTY_MANAGER').first()
supervisor = User.objects.filter(role='MAINTENANCE_SUPERVISOR').first()
tech = User.objects.filter(role='MAINTENANCE_TECHNICIAN').first()

if not all([manager, supervisor, tech]):
    print("ERROR: Required users not found. Run populate_sample_data first.")
    exit(1)

# Create warranties
print("\nCreating warranties...")
assets_with_warranty = Asset.objects.filter(asset_type='EQP')[:3]
for asset in assets_with_warranty:
    if not hasattr(asset, 'warranty'):
        warranty = AssetWarranty.objects.create(
            asset=asset,
            provider='DMU Warranty Services',
            warranty_number=f'WR-{asset.asset_id}',
            start_date=asset.purchase_date or date(2023, 1, 1),
            end_date=date(2025, 12, 31),
            coverage_details='Full coverage including parts and labor',
            contact_email='warranty@dmu.edu.et',
            contact_phone='+251-911-123456'
        )
        print(f'✓ Created warranty for {asset.asset_id}')

# Create insurance policies
print("\nCreating insurance policies...")
assets_with_insurance = Asset.objects.all()[:4]
for idx, asset in enumerate(assets_with_insurance):
    if not AssetInsurance.objects.filter(asset=asset).exists():
        insurance = AssetInsurance.objects.create(
            asset=asset,
            policy_number=f'INS-{asset.asset_id}-2024',
            provider='Ethiopian Insurance Corporation',
            policy_type='COMPREHENSIVE',
            coverage_amount=float(asset.current_value or asset.purchase_cost or 50000),
            premium_amount=float(asset.current_value or asset.purchase_cost or 50000) * 0.05,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            renewal_date=date(2024, 11, 30),
            notes='Annual comprehensive coverage'
        )
        print(f'✓ Created insurance for {asset.asset_id}')

# Create checkouts
print("\nCreating checkouts...")
checkout_assets = Asset.objects.filter(status='IN_USE')[:2]
for asset in checkout_assets:
    if not AssetCheckout.objects.filter(asset=asset, is_returned=False).exists():
        checkout = AssetCheckout.objects.create(
            asset=asset,
            checked_out_to=manager,
            checked_out_by=supervisor,
            expected_return_date=date.today() + timedelta(days=30),
            checkout_condition='GOOD',
            purpose='Department project work',
            notes='Regular checkout for project use'
        )
        print(f'✓ Created checkout for {asset.asset_id}')

# Create overdue checkout
overdue_asset = Asset.objects.filter(status='AVAILABLE').first()
if overdue_asset and not AssetCheckout.objects.filter(asset=overdue_asset, is_returned=False).exists():
    overdue_checkout = AssetCheckout.objects.create(
        asset=overdue_asset,
        checked_out_to=tech,
        checked_out_by=manager,
        expected_return_date=date.today() - timedelta(days=5),
        checkout_condition='GOOD',
        purpose='Maintenance testing',
        notes='Should have been returned'
    )
    print(f'✓ Created overdue checkout for {overdue_asset.asset_id}')

# Create budgets
print("\nCreating budgets...")
current_year = date.today().year
campuses = Campus.objects.all()
for campus in campuses:
    if not Budget.objects.filter(campus=campus, fiscal_year=current_year).exists():
        budget = Budget.objects.create(
            name=f'{campus.name} Asset Budget',
            fiscal_year=current_year,
            campus=campus,
            department='Property Management',
            total_amount=500000.00,
            allocated_amount=300000.00,
            spent_amount=150000.00,
            start_date=date(current_year, 1, 1),
            end_date=date(current_year, 12, 31),
            notes=f'Annual budget for {campus.name}',
            is_active=True
        )
        print(f'✓ Created budget for {campus.name}')
        
        # Create sample transactions
        campus_assets = Asset.objects.filter(campus=campus)[:2]
        for asset in campus_assets:
            if asset.purchase_cost:
                transaction = BudgetTransaction.objects.create(
                    budget=budget,
                    transaction_type='PURCHASE',
                    amount=float(asset.purchase_cost),
                    description=f'Purchase of {asset.name}',
                    reference_number=asset.asset_id,
                    asset=asset,
                    approved_by=manager
                )
                print(f'  ✓ Created transaction for {asset.asset_id}')

print("\n✅ Sample data creation complete!")
print("\nSummary:")
print(f"  Warranties: {AssetWarranty.objects.count()}")
print(f"  Insurance Policies: {AssetInsurance.objects.count()}")
print(f"  Checkouts: {AssetCheckout.objects.count()}")
print(f"  Budgets: {Budget.objects.count()}")
print(f"  Budget Transactions: {BudgetTransaction.objects.count()}")
print(f"  Documents: {AssetDocument.objects.count()}")
