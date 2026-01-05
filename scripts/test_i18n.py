#!/usr/bin/env python3
"""
Test script to verify i18n implementation
"""

import os
from pathlib import Path

def test_files_exist():
    """Check that all expected files exist"""
    print("🔍 Testing file existence...")
    
    files = [
        "project.html",
        "es/project.html",
        "i18n/en.json",
        "i18n/es.json",
        "scripts/generate_i18n.py"
    ]
    
    all_exist = True
    for file_path in files:
        path = Path(file_path)
        if path.exists():
            print(f"  ✓ {file_path}")
        else:
            print(f"  ✗ {file_path} - NOT FOUND")
            all_exist = False
    
    return all_exist

def test_html_lang_attributes():
    """Check HTML lang attributes are correct"""
    print("\n🌍 Testing HTML lang attributes...")
    
    tests = [
        ("project.html", 'lang="en"'),
        ("es/project.html", 'lang="es"')
    ]
    
    all_correct = True
    for file_path, expected in tests:
        path = Path(file_path)
        if not path.exists():
            print(f"  ✗ {file_path} - File not found")
            all_correct = False
            continue
            
        content = path.read_text(encoding='utf-8')
        if expected in content:
            print(f"  ✓ {file_path} has {expected}")
        else:
            print(f"  ✗ {file_path} missing {expected}")
            all_correct = False
    
    return all_correct

def test_hreflang_tags():
    """Check hreflang tags are present"""
    print("\n🔗 Testing hreflang tags...")
    
    required_tags = [
        'rel="alternate" hreflang="en"',
        'rel="alternate" hreflang="es"',
        'rel="alternate" hreflang="x-default"'
    ]
    
    all_correct = True
    for file_path in ["project.html", "es/project.html"]:
        path = Path(file_path)
        if not path.exists():
            continue
            
        content = path.read_text(encoding='utf-8')
        print(f"\n  Checking {file_path}:")
        
        for tag in required_tags:
            if tag in content:
                print(f"    ✓ {tag}")
            else:
                print(f"    ✗ {tag} - MISSING")
                all_correct = False
    
    return all_correct

def test_spanish_translations():
    """Check Spanish translations are present"""
    print("\n🇲🇽 Testing Spanish translations...")
    
    es_file = Path("es/project.html")
    if not es_file.exists():
        print("  ✗ es/project.html not found")
        return False
    
    content = es_file.read_text(encoding='utf-8')
    
    spanish_terms = [
        "Explorar Portafolio",
        "Reservar Sesión",
        "Proyecto"
    ]
    
    all_found = True
    for term in spanish_terms:
        if term in content:
            print(f"  ✓ Found: {term}")
        else:
            print(f"  ✗ Missing: {term}")
            all_found = False
    
    return all_found

def main():
    """Run all tests"""
    print("=" * 60)
    print("i18n Implementation Test Suite")
    print("=" * 60 + "\n")
    
    results = []
    
    results.append(("File Existence", test_files_exist()))
    results.append(("HTML Lang Attributes", test_html_lang_attributes()))
    results.append(("Hreflang Tags", test_hreflang_tags()))
    results.append(("Spanish Translations", test_spanish_translations()))
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    all_passed = True
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status:8} {test_name}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All tests passed! i18n is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    exit(main())
