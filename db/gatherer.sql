-- phpMyAdmin SQL Dump
-- version 3.4.10.1deb1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Jan 21, 2013 at 10:57 AM
-- Server version: 5.5.28
-- PHP Version: 5.3.10-1ubuntu3.4

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `gatherer`
--
-- USE mouli_gatherer;

-- --------------------------------------------------------

--
-- Table structure for table `candidate`
--

DROP TABLE IF EXISTS `candidate`;
CREATE TABLE IF NOT EXISTS `candidate` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `auction_id` varchar(20) NOT NULL,
  `lot_id` varchar(20) NOT NULL,
  `source` varchar(20) NOT NULL,
  `source_url` varchar(255) NOT NULL,
  `auction_title` varchar(255) DEFAULT NULL,
  `auction_date` date DEFAULT NULL,
  `auction_timestamp` timestamp NULL DEFAULT NULL,
  `lot_title` text,
  `lot_criteria` text,
  `lot_estimates` text,
  `lot_price` varchar(255) DEFAULT NULL,
  `lot_currency` varchar(10) DEFAULT NULL,
  `info` text NOT NULL,
  `status` enum('pending','deleted','validated') NOT NULL DEFAULT 'pending',
  `img_thumbnail` varchar(255) DEFAULT NULL,
  `img_medium` varchar(255) DEFAULT NULL,
  `img_full` varchar(255) DEFAULT NULL,
  `modified_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `modified_date` (`modified_date`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `trace`
--

DROP TABLE IF EXISTS `trace`;
CREATE TABLE IF NOT EXISTS `trace` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `target` varchar(20) NOT NULL,
  `page` int(10) NOT NULL DEFAULT '1',
  `auctionId` varchar(255) NOT NULL DEFAULT '',
  `lotPage` int(10) NOT NULL DEFAULT '0',
  `month` int(10) NOT NULL DEFAULT '1',
  `year` int(10) NOT NULL DEFAULT '2007',
  PRIMARY KEY (`id`),
  UNIQUE KEY `target` (`target`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=4 ;

--
-- Dumping data for table `trace`
--

INSERT INTO `trace` (`id`, `target`) VALUES
(1, 'antiquorum'),
(2, 'christies'),
(3, 'sothebys');
SET FOREIGN_KEY_CHECKS=1;
