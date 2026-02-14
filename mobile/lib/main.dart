import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/cards_provider.dart';
import 'providers/transactions_provider.dart';

// Screens
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/kyc_screen.dart';
import 'screens/main_screen.dart';
import 'screens/cards/card_detail_screen.dart';
import 'screens/cards/purchase_card_screen.dart';
import 'screens/transactions/topup_screen.dart';
import 'screens/transactions/withdraw_screen.dart';
import 'screens/notifications/notifications_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize date formatting for French locale
  await initializeDateFormatting('fr_FR', null);

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
          '/main': (context) => const MainScreen(),
          '/card-detail': (context) => const CardDetailScreen(),
          '/purchase-card': (context) => const PurchaseCardScreen(),
          '/topup': (context) => const TopupScreen(),
          '/withdraw': (context) => const WithdrawScreen(),
          '/notifications': (context) => const NotificationsScreen(),
        },
      ),
    );
  }
}

/// Auth gate to check if user is logged in
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
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
