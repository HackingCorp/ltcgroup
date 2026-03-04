import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/cards_provider.dart';
import 'providers/transactions_provider.dart';
import 'providers/wallet_provider.dart';

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
import 'screens/wallet/wallet_topup_screen.dart';
import 'screens/wallet/transfer_to_card_screen.dart';
import 'screens/wallet/wallet_withdraw_screen.dart';
import 'screens/transactions/transaction_detail_screen.dart';
import 'screens/transactions/transaction_list_screen.dart';
import 'screens/notifications/notifications_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';

// Services
import 'services/storage_service.dart';
import 'services/biometric_service.dart';
import 'services/notification_service.dart';

/// Allow bad certificates in debug mode (self-signed / dev servers)
class _DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Only bypass SSL in debug mode (kDebugMode is false in release builds)
  if (kDebugMode) {
    HttpOverrides.global = _DevHttpOverrides();
  }

  // Initialize Firebase only if real credentials are configured
  if (DefaultFirebaseOptions.isConfigured) {
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } catch (e) {
      debugPrint('Firebase init failed: $e');
    }
  }

  // Initialize date formatting for French locale
  await initializeDateFormatting('fr_FR', null);

  // Initialize notifications (requires Firebase)
  if (DefaultFirebaseOptions.isConfigured) {
    try {
      final notificationService = NotificationService();
      await notificationService.initializeNotifications();
    } catch (e) {
      debugPrint('Notification init failed: $e');
    }
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
        ChangeNotifierProvider(create: (_) => WalletProvider()),
      ],
      child: MaterialApp(
        title: 'Kash Pay',
        debugShowCheckedModeBanner: false,
        theme: LTCTheme.darkTheme,
        builder: (context, child) {
          return GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            child: child,
          );
        },
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
          '/transactions': (context) => const TransactionListScreen(),
          '/notifications': (context) => const NotificationsScreen(),
          '/wallet-topup': (context) => const WalletTopupScreen(),
          '/wallet-transfer': (context) => const TransferToCardScreen(),
          '/wallet-withdraw': (context) => const WalletWithdrawScreen(),
          '/onboarding': (context) => OnboardingScreen(onComplete: () {
            Navigator.of(context).pushReplacementNamed('/');
          }),
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
  bool _onboardingSeen = true; // default true to avoid flash

  @override
  void initState() {
    super.initState();
    _checkBiometricAvailability();
    // Safety timeout: never show spinner for more than 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted && !_checkedBiometric) {
        debugPrint('AuthGate: biometric check timed out');
        setState(() => _checkedBiometric = true);
      }
    });
  }

  Future<void> _checkBiometricAvailability() async {
    try {
      final isLoggedIn = await _storageService.isLoggedIn();
      final biometricEnabled = await _storageService.isBiometricEnabled();
      final biometricAvailable = await _biometricService.checkBiometricAvailable();
      final onboardingSeen = await _storageService.isOnboardingSeen();

      if (!mounted) return;
      setState(() {
        _onboardingSeen = onboardingSeen;
        _shouldUseBiometric = isLoggedIn && biometricEnabled && biometricAvailable;
        _checkedBiometric = true;
      });
    } catch (e) {
      debugPrint('Biometric check error: $e');
      if (!mounted) return;
      setState(() {
        _checkedBiometric = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_checkedBiometric) {
      // Show login screen immediately, not a blank loading page
      return const LoginScreen();
    }

    if (!_onboardingSeen) {
      return OnboardingScreen(
        onComplete: () {
          setState(() => _onboardingSeen = true);
        },
      );
    }

    if (_shouldUseBiometric) {
      return const BiometricScreen();
    }

    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        // Show login screen while loading instead of blank spinner
        if (authProvider.isLoading) {
          return const LoginScreen();
        }

        if (authProvider.isAuthenticated) {
          return const MainScreen();
        }

        return const LoginScreen();
      },
    );
  }
}
