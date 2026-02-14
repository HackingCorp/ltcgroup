import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/cards_provider.dart';
import 'providers/transactions_provider.dart';

// Screens
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/kyc_screen.dart';
import 'screens/auth/biometric_screen.dart';
import 'screens/main_screen.dart';
import 'screens/cards/card_detail_screen.dart';
import 'screens/cards/purchase_card_screen.dart';
import 'screens/transactions/topup_screen.dart';
import 'screens/transactions/withdraw_screen.dart';
import 'screens/transactions/transaction_detail_screen.dart';
import 'screens/notifications/notifications_screen.dart';

// Services
import 'services/storage_service.dart';
import 'services/biometric_service.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    // Ignore Firebase initialization errors in case config is not set up yet
  }

  // Initialize date formatting for French locale
  await initializeDateFormatting('fr_FR', null);

  // Initialize notifications
  try {
    final notificationService = NotificationService();
    await notificationService.initializeNotifications();
  } catch (e) {
    // Ignore notification initialization errors
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initialize()),
        ChangeNotifierProvider(create: (_) => CardsProvider()),
        ChangeNotifierProvider(create: (_) => TransactionsProvider()),
      ],
      child: MaterialApp(
        title: 'LTC vCard',
        debugShowCheckedModeBanner: false,
        theme: LTCTheme.lightTheme,
        initialRoute: '/',
        routes: {
          '/': (context) => const AuthGate(),
          '/register': (context) => const RegisterScreen(),
          '/kyc': (context) => const KycScreen(),
          '/biometric': (context) => const BiometricScreen(),
          '/main': (context) => const MainScreen(),
          '/card-detail': (context) => const CardDetailScreen(),
          '/purchase-card': (context) => const PurchaseCardScreen(),
          '/topup': (context) => const TopupScreen(),
          '/withdraw': (context) => const WithdrawScreen(),
          '/transaction-detail': (context) => const TransactionDetailScreen(),
          '/notifications': (context) => const NotificationsScreen(),
        },
      ),
    );
  }
}

/// Auth gate to check if user is logged in and handle biometric auth
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final StorageService _storageService = StorageService();
  final BiometricService _biometricService = BiometricService();
  bool _checkedBiometric = false;
  bool _shouldUseBiometric = false;

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
  }

  Future<void> _checkBiometricAvailability() async {
    final isLoggedIn = await _storageService.isLoggedIn();
    final biometricEnabled = await _storageService.isBiometricEnabled();
    final biometricAvailable = await _biometricService.checkBiometricAvailable();

    setState(() {
      _shouldUseBiometric = isLoggedIn && biometricEnabled && biometricAvailable;
      _checkedBiometric = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_checkedBiometric) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_shouldUseBiometric) {
      return const BiometricScreen();
    }

    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        if (authProvider.isLoading) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (authProvider.isAuthenticated) {
          return const MainScreen();
        }

        return const LoginScreen();
      },
    );
  }
}
