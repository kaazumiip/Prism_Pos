import 'dart:convert';
import 'package:http/http.dart' as http;

class Product {
  final String id;
  final String name;
  final double price;
  final String barcode;

  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.barcode,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unknown Product',
      // Handle price being int or double or string, or null
      price: double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      barcode: json['barcode']?.toString() ?? '',
    );
  }
}

class ScanResult {
  final bool success;
  final String message;
  final Product? product;

  ScanResult({
    required this.success,
    required this.message,
    this.product,
  });
}

class ApiService {
  // Use 10.0.2.2 for Android Emulator, localhost for Windows/iOS
  // Since we are targeting Windows in the logs, localhost is correct.
  // If running on actual Android device, this needs to be the PC's IP.
  static const String baseUrl = 'http://10.107.87.8:3000/api';

  Future<ScanResult> sendBarcode(String barcode) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/products/scan'),
        headers: {'Content-Type': 'application/json'},
        // Send addToCart flag to process everything in one request
        body: jsonEncode({'barcode': barcode, 'addToCart': true}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final product = Product.fromJson(data);
        
        // No need to call _addToCart separately anymore
        
        return ScanResult(
          success: true, 
          message: 'Product found', 
          product: product
        );
      } else if (response.statusCode == 404) {
        return ScanResult(success: false, message: 'Product not found');
      } else {
        return ScanResult(success: false, message: 'Server error: ${response.statusCode}');
      }
    } catch (e) {
      return ScanResult(success: false, message: 'Connection error: $e');
    }
  }
}
