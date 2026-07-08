from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.assets.models import Campus, Building, Floor, Room, Asset
from apps.maintenance.models import MaintenanceRequest, WorkOrder, PreventiveMaintenance
from datetime import date, timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate database with sample data'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create users
        admin, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@dmu.edu.et',
                'first_name': 'System',
                'last_name': 'Admin',
                'role': 'SUPER_ADMIN',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if _:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS(f'Created admin user'))
        
        manager, _ = User.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@dmu.edu.et',
                'first_name': 'Property',
                'last_name': 'Manager',
                'role': 'PROPERTY_MANAGER',
                'department': 'Property Management'
            }
        )
        if _:
            manager.set_password('manager123')
            manager.save()
            self.stdout.write(self.style.SUCCESS(f'Created manager user'))
        
        supervisor, _ = User.objects.get_or_create(
            username='supervisor',
            defaults={
                'email': 'supervisor@dmu.edu.et',
                'first_name': 'Maintenance',
                'last_name': 'Supervisor',
                'role': 'MAINTENANCE_SUPERVISOR',
                'department': 'Maintenance'
            }
        )
        if _:
            supervisor.set_password('supervisor123')
            supervisor.save()
            self.stdout.write(self.style.SUCCESS(f'Created supervisor user'))
        
        tech, _ = User.objects.get_or_create(
            username='technician',
            defaults={
                'email': 'tech@dmu.edu.et',
                'first_name': 'John',
                'last_name': 'Technician',
                'role': 'MAINTENANCE_TECHNICIAN',
                'department': 'Maintenance'
            }
        )
        if _:
            tech.set_password('tech123')
            tech.save()
            self.stdout.write(self.style.SUCCESS(f'Created technician user'))
        
        # Create campuses
        main_campus, _ = Campus.objects.get_or_create(
            code='MAIN',
            defaults={
                'name': 'Main Campus',
                'address': 'Debre Markos, Ethiopia'
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Created campus: {main_campus}'))
        
        burie_campus, _ = Campus.objects.get_or_create(
            code='BURIE',
            defaults={
                'name': 'Burie Campus',
                'address': 'Burie, Ethiopia'
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Created campus: {burie_campus}'))
        
        health_campus, _ = Campus.objects.get_or_create(
            code='HEALTH',
            defaults={
                'name': 'Health Campus',
                'address': 'Debre Markos, Ethiopia'
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Created campus: {health_campus}'))
        
        # Create buildings for Main Campus
        admin_building, _ = Building.objects.get_or_create(
            campus=main_campus,
            code='ADM',
            defaults={
                'name': 'Administration Building',
                'floors_count': 3
            }
        )
        
        library, _ = Building.objects.get_or_create(
            campus=main_campus,
            code='LIB',
            defaults={
                'name': 'Library',
                'floors_count': 4
            }
        )
        
        engineering, _ = Building.objects.get_or_create(
            campus=main_campus,
            code='ENG',
            defaults={
                'name': 'Engineering Building',
                'floors_count': 3
            }
        )
        
        science, _ = Building.objects.get_or_create(
            campus=main_campus,
            code='SCI',
            defaults={
                'name': 'Science Building',
                'floors_count': 4
            }
        )
        
        student_center, _ = Building.objects.get_or_create(
            campus=main_campus,
            code='SC',
            defaults={
                'name': 'Student Center',
                'floors_count': 2
            }
        )
        
        # Create buildings for Burie Campus
        burie_admin, _ = Building.objects.get_or_create(
            campus=burie_campus,
            code='ADM',
            defaults={
                'name': 'Administration Building',
                'floors_count': 2
            }
        )
        
        burie_academic, _ = Building.objects.get_or_create(
            campus=burie_campus,
            code='ACD',
            defaults={
                'name': 'Academic Building',
                'floors_count': 3
            }
        )
        
        burie_lab, _ = Building.objects.get_or_create(
            campus=burie_campus,
            code='LAB',
            defaults={
                'name': 'Laboratory Building',
                'floors_count': 2
            }
        )
        
        # Create buildings for Health Campus
        health_building, _ = Building.objects.get_or_create(
            campus=health_campus,
            code='MED',
            defaults={
                'name': 'Medical Building',
                'floors_count': 3
            }
        )
        
        nursing_building, _ = Building.objects.get_or_create(
            campus=health_campus,
            code='NUR',
            defaults={
                'name': 'Nursing Building',
                'floors_count': 2
            }
        )
        
        clinic, _ = Building.objects.get_or_create(
            campus=health_campus,
            code='CLN',
            defaults={
                'name': 'University Clinic',
                'floors_count': 2
            }
        )
        
        self.stdout.write(self.style.SUCCESS(f'Created {Building.objects.count()} buildings'))
        
        # Create floors and rooms for Main Campus - Administration Building
        admin_floors = []
        for floor_num in range(1, 4):  # 3 floors
            floor, _ = Floor.objects.get_or_create(
                building=admin_building,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            admin_floors.append(floor)
            
            # Create rooms for each floor
            room_types = ['Office', 'Conference Room', 'Storage', 'Meeting Room']
            for room_num in range(1, 6):  # 5 rooms per floor
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'{floor_num}0{room_num}',
                    defaults={
                        'name': f'Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        # Create floors and rooms for Library
        lib_floors = []
        for floor_num in range(1, 5):  # 4 floors
            floor, _ = Floor.objects.get_or_create(
                building=library,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            lib_floors.append(floor)
            
            room_types = ['Reading Room', 'Study Room', 'Computer Lab', 'Archive']
            for room_num in range(1, 7):  # 6 rooms per floor
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'L{floor_num}0{room_num}',
                    defaults={
                        'name': f'Library Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        # Create floors and rooms for Engineering Building
        for floor_num in range(1, 4):  # 3 floors
            floor, _ = Floor.objects.get_or_create(
                building=engineering,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Classroom', 'Laboratory', 'Workshop', 'Faculty Office']
            for room_num in range(1, 8):  # 7 rooms per floor
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'E{floor_num}0{room_num}',
                    defaults={
                        'name': f'Engineering Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        # Create floors and rooms for Science Building
        for floor_num in range(1, 5):  # 4 floors
            floor, _ = Floor.objects.get_or_create(
                building=science,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Laboratory', 'Classroom', 'Research Lab', 'Prep Room']
            for room_num in range(1, 6):  # 5 rooms per floor
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'S{floor_num}0{room_num}',
                    defaults={
                        'name': f'Science Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        # Create floors and rooms for Student Center
        for floor_num in range(1, 3):  # 2 floors
            floor, _ = Floor.objects.get_or_create(
                building=student_center,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Cafeteria', 'Lounge', 'Activity Room', 'Office']
            for room_num in range(1, 5):  # 4 rooms per floor
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'SC{floor_num}0{room_num}',
                    defaults={
                        'name': f'Student Center Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        # Create floors and rooms for Burie Campus buildings
        for floor_num in range(1, 3):  # 2 floors for admin
            floor, _ = Floor.objects.get_or_create(
                building=burie_admin,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            for room_num in range(1, 5):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'BA{floor_num}0{room_num}',
                    defaults={
                        'name': f'Burie Admin Room {floor_num}0{room_num}',
                        'room_type': 'Office'
                    }
                )
        
        for floor_num in range(1, 4):  # 3 floors for academic
            floor, _ = Floor.objects.get_or_create(
                building=burie_academic,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Classroom', 'Laboratory', 'Faculty Office']
            for room_num in range(1, 6):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'BC{floor_num}0{room_num}',
                    defaults={
                        'name': f'Burie Academic Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        for floor_num in range(1, 3):  # 2 floors for lab
            floor, _ = Floor.objects.get_or_create(
                building=burie_lab,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            for room_num in range(1, 4):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'BL{floor_num}0{room_num}',
                    defaults={
                        'name': f'Burie Lab Room {floor_num}0{room_num}',
                        'room_type': 'Laboratory'
                    }
                )
        
        # Create floors and rooms for Health Campus buildings
        for floor_num in range(1, 4):  # 3 floors for medical
            floor, _ = Floor.objects.get_or_create(
                building=health_building,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Classroom', 'Laboratory', 'Simulation Room', 'Faculty Office']
            for room_num in range(1, 6):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'M{floor_num}0{room_num}',
                    defaults={
                        'name': f'Medical Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        for floor_num in range(1, 3):  # 2 floors for nursing
            floor, _ = Floor.objects.get_or_create(
                building=nursing_building,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Classroom', 'Skills Lab', 'Office']
            for room_num in range(1, 5):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'N{floor_num}0{room_num}',
                    defaults={
                        'name': f'Nursing Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        for floor_num in range(1, 3):  # 2 floors for clinic
            floor, _ = Floor.objects.get_or_create(
                building=clinic,
                number=floor_num,
                defaults={'name': f'Floor {floor_num}' if floor_num > 1 else 'Ground Floor'}
            )
            
            room_types = ['Examination Room', 'Treatment Room', 'Pharmacy', 'Office']
            for room_num in range(1, 6):
                Room.objects.get_or_create(
                    floor=floor,
                    number=f'C{floor_num}0{room_num}',
                    defaults={
                        'name': f'Clinic Room {floor_num}0{room_num}',
                        'room_type': room_types[room_num % len(room_types)]
                    }
                )
        
        total_floors = Floor.objects.count()
        total_rooms = Room.objects.count()
        self.stdout.write(self.style.SUCCESS(f'Created {total_floors} floors and {total_rooms} rooms'))
        
        # Get reference rooms for asset creation
        floor1 = admin_floors[0] if admin_floors else Floor.objects.first()
        floor2 = admin_floors[1] if len(admin_floors) > 1 else Floor.objects.first()
        lib_floor1 = lib_floors[0] if lib_floors else Floor.objects.first()
        
        room101 = Room.objects.filter(floor=floor1).first()
        room201 = Room.objects.filter(floor=floor2).first()
        reading_room = Room.objects.filter(floor=lib_floor1).first()
        
        # Create assets
        if not Asset.objects.filter(name='Dell Optiplex 7090').exists():
            computer = Asset.objects.create(
                name='Dell Optiplex 7090',
                asset_type='EQP',
                status='IN_USE',
                campus=main_campus,
                room=room201,
                purchase_date=date(2023, 1, 15),
                purchase_cost=45000.00,
                current_value=40000.00,
                description='Desktop computer for IT staff',
                specifications={
                    'processor': 'Intel Core i7',
                    'ram': '16GB',
                    'storage': '512GB SSD'
                },
                assigned_to=manager
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {computer.asset_id}'))
        
        if not Asset.objects.filter(name='HP LaserJet Pro').exists():
            printer = Asset.objects.create(
                name='HP LaserJet Pro',
                asset_type='EQP',
                status='AVAILABLE',
                campus=main_campus,
                room=room101,
                purchase_date=date(2023, 3, 20),
                purchase_cost=15000.00,
                current_value=13000.00,
                description='Network printer for reception',
                specifications={
                    'type': 'Laser',
                    'color': 'Monochrome',
                    'network': 'Ethernet'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {printer.asset_id}'))
        
        if not Asset.objects.filter(name='Office Desk').exists():
            desk = Asset.objects.create(
                name='Office Desk',
                asset_type='FUR',
                status='IN_USE',
                campus=main_campus,
                room=room201,
                purchase_date=date(2022, 6, 10),
                purchase_cost=8000.00,
                current_value=6000.00,
                description='Wooden office desk',
                specifications={
                    'material': 'Wood',
                    'dimensions': '150x80x75 cm'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {desk.asset_id}'))
        
        if not Asset.objects.filter(name='Reading Table').exists():
            table = Asset.objects.create(
                name='Reading Table',
                asset_type='FUR',
                status='AVAILABLE',
                campus=main_campus,
                room=reading_room,
                purchase_date=date(2022, 8, 5),
                purchase_cost=5000.00,
                current_value=4500.00,
                description='Library reading table',
                specifications={
                    'material': 'Wood',
                    'seats': '4'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {table.asset_id}'))
        
        # Create assets for Burie Campus
        if not Asset.objects.filter(name='Lenovo ThinkPad', campus=burie_campus).exists():
            laptop = Asset.objects.create(
                name='Lenovo ThinkPad',
                asset_type='EQP',
                status='IN_USE',
                campus=burie_campus,
                purchase_date=date(2023, 5, 10),
                purchase_cost=35000.00,
                current_value=32000.00,
                description='Laptop for administrative staff',
                specifications={
                    'processor': 'Intel Core i5',
                    'ram': '8GB',
                    'storage': '256GB SSD'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {laptop.asset_id}'))
        
        if not Asset.objects.filter(name='Conference Table', campus=burie_campus).exists():
            conf_table = Asset.objects.create(
                name='Conference Table',
                asset_type='FUR',
                status='AVAILABLE',
                campus=burie_campus,
                purchase_date=date(2023, 2, 15),
                purchase_cost=12000.00,
                current_value=11000.00,
                description='Large conference table',
                specifications={
                    'material': 'Wood',
                    'seats': '10'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {conf_table.asset_id}'))
        
        # Create assets for Health Campus
        if not Asset.objects.filter(name='Medical Equipment Cart', campus=health_campus).exists():
            med_cart = Asset.objects.create(
                name='Medical Equipment Cart',
                asset_type='EQP',
                status='IN_USE',
                campus=health_campus,
                purchase_date=date(2023, 4, 1),
                purchase_cost=25000.00,
                current_value=23000.00,
                description='Mobile medical equipment cart',
                specifications={
                    'material': 'Stainless Steel',
                    'shelves': '3'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {med_cart.asset_id}'))
        
        if not Asset.objects.filter(name='Examination Bed', campus=health_campus).exists():
            exam_bed = Asset.objects.create(
                name='Examination Bed',
                asset_type='FUR',
                status='AVAILABLE',
                campus=health_campus,
                purchase_date=date(2023, 3, 10),
                purchase_cost=18000.00,
                current_value=17000.00,
                description='Adjustable examination bed',
                specifications={
                    'type': 'Hydraulic',
                    'adjustable': 'Yes'
                }
            )
            self.stdout.write(self.style.SUCCESS(f'Created asset: {exam_bed.asset_id}'))
        
        # Create maintenance requests and work orders
        assets = Asset.objects.all()
        if assets.exists():
            # Clear existing requests to avoid duplicates
            if MaintenanceRequest.objects.count() < 5:
                categories = ['ELECTRICAL', 'PLUMBING', 'HVAC', 'STRUCTURAL', 'EQUIPMENT']
                priorities = ['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW']
                statuses = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
                
                for i, asset in enumerate(assets[:6]):
                    status = statuses[i % len(statuses)]
                    
                    req = MaintenanceRequest.objects.create(
                        asset=asset,
                        category=categories[i % len(categories)],
                        priority=priorities[i % len(priorities)],
                        description=f'Sample maintenance issue for {asset.name}. Requires immediate attention.',
                        requested_by=manager,
                        status=status,
                        assigned_to=tech if status != 'SUBMITTED' else None
                    )
                    self.stdout.write(self.style.SUCCESS(f'Created maintenance request: {req.request_id}'))
                    
                    # Create work order for assigned requests
                    if status in ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']:
                        wo = WorkOrder.objects.create(
                            request=req,
                            assigned_to=tech,
                            notes=f'Work order for {req.request_id}',
                            cost_labor=1000 + (i * 500),
                            cost_materials=500 + (i * 200)
                        )
                        if status == 'IN_PROGRESS':
                            wo.started_at = date.today()
                            wo.save()
                        elif status == 'COMPLETED':
                            wo.started_at = date.today() - timedelta(days=2)
                            wo.completed_at = date.today()
                            wo.save()
                        
                        self.stdout.write(self.style.SUCCESS(f'Created work order: WO-{wo.id}'))
        
        # Create preventive maintenance schedules
        if assets.exists() and PreventiveMaintenance.objects.count() == 0:
            for asset in assets[:3]:
                pm = PreventiveMaintenance.objects.create(
                    asset=asset,
                    description=f'Routine maintenance for {asset.name}',
                    interval_days=90,
                    next_due_date=date.today() + timedelta(days=30),
                    assigned_team='Maintenance Team A',
                    is_active=True
                )
                self.stdout.write(self.style.SUCCESS(f'Created preventive maintenance schedule for {asset.asset_id}'))
        
        self.stdout.write(self.style.SUCCESS('Sample data created successfully!'))
        self.stdout.write(self.style.WARNING('\nLogin credentials:'))
        self.stdout.write('Admin: admin / admin123')
        self.stdout.write('Manager: manager / manager123')
        self.stdout.write('Supervisor: supervisor / supervisor123')
        self.stdout.write('Technician: technician / tech123')

        
        # Create sample warranties
        from apps.assets.models import AssetWarranty, AssetInsurance, AssetCheckout, Budget, BudgetTransaction, AssetDocument
        
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
                self.stdout.write(self.style.SUCCESS(f'Created warranty for {asset.asset_id}'))
        
        # Create sample insurance policies
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
                self.stdout.write(self.style.SUCCESS(f'Created insurance for {asset.asset_id}'))
        
        # Create sample checkouts
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
                self.stdout.write(self.style.SUCCESS(f'Created checkout for {asset.asset_id}'))
        
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
            self.stdout.write(self.style.SUCCESS(f'Created overdue checkout for {overdue_asset.asset_id}'))
        
        # Create budgets
        current_year = date.today().year
        for campus in [main_campus, burie_campus, health_campus]:
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
                self.stdout.write(self.style.SUCCESS(f'Created budget for {campus.name}'))
                
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
                        self.stdout.write(self.style.SUCCESS(f'Created transaction for {asset.asset_id}'))
        
        # Create sample documents
        doc_assets = Asset.objects.all()[:3]
        for asset in doc_assets:
            if not AssetDocument.objects.filter(asset=asset).exists():
                # Note: In production, you would upload actual files
                # For now, we'll create records without actual files
                doc = AssetDocument.objects.create(
                    asset=asset,
                    title=f'{asset.name} User Manual',
                    document_type='MANUAL',
                    description='User manual and specifications',
                    uploaded_by=manager
                )
                self.stdout.write(self.style.SUCCESS(f'Created document for {asset.asset_id}'))
